const API_URL = import.meta.env.MODE === 'production' 
  ? '' 
  : 'http://localhost:8000';

export const processVideo = async (videoUrl, userPrompt) => {
  const response = await fetch(`${API_URL}/api/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_url: videoUrl,
      user_prompt: userPrompt
    })
  })

  if (!response.ok) {
    throw new Error('Failed to process video')
  }

  return response.json()
}
