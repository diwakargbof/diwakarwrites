import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const maxDuration = 30

function wc(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

function strip(html: string, maxChars = 800) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > maxChars ? t.slice(0, maxChars) + '…' : t
}

export async function POST(req: Request) {
  const { messages, manuscriptId }: { messages: UIMessage[]; manuscriptId?: string } = await req.json()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: manuscripts }, { data: writings }, { data: recentDiary }] = await Promise.all([
    supabase.from('manuscripts').select('*').order('created_at', { ascending: false }),
    supabase.from('writings').select('id,title,content,section,manuscript_id,created_at,published').order('created_at', { ascending: false }),
    supabase.from('writings').select('title,content,created_at').eq('section', 'diary').eq('published', true).order('created_at', { ascending: false }).limit(3),
  ])

  const allWritings = writings ?? []
  const allManuscripts = manuscripts ?? []

  // Books context
  const booksContext = allManuscripts.map(m => {
    const chapters = allWritings.filter(w => w.manuscript_id === m.id)
    const totalWords = chapters.reduce((s, c) => s + wc(c.content), 0)
    const chapterList = chapters.map((c, i) =>
      `  Ch.${i + 1} "${c.title}" (${wc(c.content)} words)${i === 0 ? ` — excerpt: "${strip(c.content, 400)}"` : ''}`
    ).join('\n')
    return `MANUSCRIPT: "${m.title}"${m.genre ? ` [${m.genre}]` : ''}
${m.description ? `Description: ${m.description}` : ''}
Progress: ${chapters.length} chapters, ${totalWords.toLocaleString()} words of ${(m.target_words || 80000).toLocaleString()} target
${chapterList || '  (no chapters yet)'}`
  }).join('\n\n')

  // Active manuscript focus (if user is working on a specific one)
  let focusContext = ''
  if (manuscriptId) {
    const ms = allManuscripts.find(m => m.id === manuscriptId)
    const chapters = allWritings.filter(w => w.manuscript_id === manuscriptId)
    if (ms && chapters.length > 0) {
      const lastChapter = chapters[chapters.length - 1]
      focusContext = `\nACTIVELY WORKING ON: "${ms.title}"
Last chapter: "${lastChapter.title}" — full excerpt:
"${strip(lastChapter.content, 1200)}"`
    }
  }

  // Pieces
  const pieces = allWritings.filter(w => !w.section || w.section === 'pieces').slice(0, 5)
  const piecesContext = pieces.map(p =>
    `"${p.title}" (${wc(p.content)} words, ${p.published ? 'published' : 'draft'}) — "${strip(p.content, 200)}"`
  ).join('\n')

  // Recent diary voice samples
  const diaryContext = (recentDiary ?? []).map(d =>
    `${d.created_at.split('T')[0]}: "${d.title}" — "${strip(d.content, 300)}"`
  ).join('\n')

  const system = `You are Diwakar's writing collaborator and editor. You know his entire body of work and understand his voice, themes, and style. Today is ${today}.

YOUR ROLE:
- Help him develop story ideas, characters, plot, and structure
- Give honest feedback on prose — not generic praise
- Help him write or continue scenes when asked (match his voice)
- Track continuity across chapters and flag inconsistencies
- Suggest what to write next based on where he left off

DIWAKAR'S WRITING VOICE (inferred from his work):
${diaryContext ? `Diary samples (reveals his natural voice):\n${diaryContext}` : 'No diary entries yet.'}

${booksContext ? `HIS BOOKS:\n${booksContext}` : 'No manuscripts yet.'}

${piecesContext ? `HIS PIECES/ESSAYS:\n${piecesContext}` : ''}
${focusContext}

Be a collaborator, not a yes-man. If something doesn't work, say why. Reference specific passages when giving feedback.`

  const result = streamText({
    model: openai('gpt-4o'),
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
