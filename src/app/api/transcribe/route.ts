import { openai } from '@ai-sdk/openai'
import { experimental_transcribe as transcribe } from 'ai'

export const maxDuration = 60

// POST multipart/form-data with an "audio" Blob → { text }
export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const file = form.get('audio')
  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: 'No audio provided' }, { status: 400 })
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { text } = await transcribe({
      model: openai.transcription('whisper-1'),
      audio: bytes,
    })
    return Response.json({ text })
  } catch (err) {
    console.error('transcribe failed:', err)
    return Response.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
