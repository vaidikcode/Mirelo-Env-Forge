import os
import json
import httpx
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

GEMINI_KEY = os.environ.get("GEMINI")
MIRELO_KEY = os.environ.get("MIRELO")

app = FastAPI()

@app.get("/")
async def root():
    return {
        "status": "online",
        "gemini_key_set": bool(GEMINI_KEY),
        "mirelo_key_set": bool(MIRELO_KEY)
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

client = genai.Client(api_key=GEMINI_KEY)

class VideoInput(BaseModel):
    video_url: str
    user_prompt: str

@app.post("/api/process")
async def process(input_data: VideoInput):
    video_url = input_data.video_url
    user_text = input_data.user_prompt
    
    print(f"Processing video: {video_url}")
    print(f"User prompt: {user_text}")
    
    if not GEMINI_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_KEY not set")
    if not MIRELO_KEY:
        raise HTTPException(status_code=500, detail="MIRELO_KEY not set")
    
    results = []

    async with httpx.AsyncClient(verify=False, timeout=60.0) as http_client:
        try:
            print(f"Downloading video from: {video_url}")
            resp = await http_client.get(video_url)
            if resp.status_code != 200:
                raise ValueError(f"Failed to download video: {resp.status_code}")
            video_bytes = resp.content
            print(f"Downloaded {len(video_bytes)} bytes")
        except Exception as e:
            print(f"Error downloading video: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid Video URL: {str(e)}")

        gemini_prompt = f"""
        You are an Environment Audio Lead.
        User Request: "{user_text}"
        
        Analyze the video and the user request to design a procedural audio system.
        Identify distinct environmental audio events (LOOPS for background, EMITTERS for specific details).
        
        For each event, provide:
        1. 'name': Short ID.
        2. 'type': "LOOP" or "EMITTER".
        3. 'start': Best timestamp to sample this texture (start offset).
        4. 'duration': LOOPS : min=1s max=10s, EMITTERS : min=1s max=10s.
        5. 'audio_prompt': A highly descriptive prompt for an SFX generator.

        Return a JSON list of objects:
        [{{ "name": "Wind", "type": "LOOP", "start": 0.0, "duration": 10.0, "audio_prompt": "Cold wind..." }}]
        """

        try:
            print("Sending to Gemini...")
            response = client.models.generate_content(
                model="gemini-flash-latest",
                contents=types.Content(
                    parts=[
                        types.Part(inline_data=types.Blob(data=video_bytes, mime_type='video/mp4')),
                        types.Part(text=gemini_prompt)
                    ]
                ),
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            print(f"Gemini response: {response.text}")
            audio_plan = json.loads(response.text)
            print(f"Parsed {len(audio_plan)} events")
        except Exception as e:
            print(f"Gemini Error: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Gemini Error: {str(e)}")

        for event in audio_plan:
            print(f"Processing event: {event.get('name')}")
            event_variations = [] 
            for i in range(3):
                payload = {
                    "video_url": video_url,
                    "start_offset": event.get("start", 0.0),
                    "duration": max(event.get("duration", 2.0), 1.0),
                    "text_prompt": event.get("audio_prompt"),
                    "model_version": "latest",
                    "seed": i * 100 + 55 
                }

                try:
                    print(f"Sending to Mirelo (variation {i+1})...")
                    mirelo_resp = await http_client.post(
                        "https://api.mirelo.ai/video-to-sfx",
                        json=payload,
                        headers={"x-api-key": MIRELO_KEY}
                    )

                    if mirelo_resp.status_code in [200, 201]:
                        data = mirelo_resp.json()
                        audio_url = None
                        
                        if "output_paths" in data and data["output_paths"]:
                            audio_url = data["output_paths"][0]
                        elif "audio_url" in data:
                            audio_url = data["audio_url"]
                        
                        if audio_url:
                            event_variations.append(audio_url)
                            print(f"Got audio URL: {audio_url}")
                    else:
                        print(f"Mirelo error: {mirelo_resp.status_code}")

                except Exception as e:
                    print(f"Mirelo API error: {str(e)}")
            
            if event_variations:
                results.append({
                    "name": event["name"],
                    "type": event["type"],
                    "variations": event_variations,
                    "metadata": event
                })

    return {"status": "success", "data": results}