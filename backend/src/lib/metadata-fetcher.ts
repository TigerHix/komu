import OpenAI from 'openai'

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

export interface MetadataSuggestion {
  author?: string
  description?: string // Original Japanese description from official sources
}

export async function fetchMetadata(title: string): Promise<MetadataSuggestion> {
  console.log('🔍 fetchMetadata called with title:', title)
  
  try {
    const prompt = `Search the web for metadata about the Japanese manga titled: "${title}"

CRITICAL REQUIREMENTS:
- Author name: Use original Japanese characters (漢字/ひらがな/カタカナ) like "鳥山明" or "尾田栄一郎" - NEVER romanized
- Description: Find the ORIGINAL Japanese book description from official sources
  * Search Amazon.co.jp, honto.jp, or other Japanese online bookstores
  * Use the EXACT official description as published - DO NOT translate, rephrase, or summarize
  * Copy the original Japanese text word-for-word from the book's product page
  * If no official Japanese description is found, use null

SOURCES TO CHECK (in order of preference):
1. Amazon.co.jp (amazon.co.jp)
2. honto.jp
3. Kinokuniya online store
4. Rakuten Books
5. Japanese publisher websites

Do NOT use English descriptions, summaries, or translations. Only use the authentic Japanese description as it appears on official book retail sites.`

    console.log('📝 Making API request to OpenRouter with structured output')
    
    const completion = await openai.chat.completions.create({
      model: process.env.SEARCH_MODEL || "openai/gpt-4o-search-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "manga_metadata",
          strict: true,
          schema: {
            type: "object",
            properties: {
              author: {
                type: ["string", "null"],
                description: "Author name in Japanese characters (漢字/ひらがな/カタカナ)"
              },
              description: {
                type: ["string", "null"], 
                description: "Original Japanese book description from official sources (Amazon.co.jp, etc.)"
              }
            },
            required: ["author", "description"],
            additionalProperties: false
          }
        }
      }
    })

    console.log('✅ OpenRouter API response received')
    console.log('📄 Raw response:', JSON.stringify(completion, null, 2))

    const content = completion.choices[0]?.message?.content
    console.log('📝 Extracted content:', content)
    
    if (!content) {
      console.log('❌ No content in response')
      return {}
    }

    // With structured output, the content should always be valid JSON
    try {
      const parsed = JSON.parse(content)
      console.log('✅ Successfully parsed structured JSON:', parsed)
      return parsed
    } catch (parseError) {
      console.log('❌ Unexpected JSON parse error with structured output:', parseError)
      console.log('❌ Content:', content)
      return {}
    }
  } catch (error) {
    console.error('❌ Error fetching metadata:', error)
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message)
      console.error('❌ Error stack:', error.stack)
    }
    return {}
  }
}