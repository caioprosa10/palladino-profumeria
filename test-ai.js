const { generateText } = require('ai')
const { google } = require('@ai-sdk/google')

async function main() {
  try {
    const result = await generateText({
      model: google('gemini-1.5-pro-latest'),
      prompt: 'Responda apenas com a palavra OK'
    })
    console.log('Result:', result.text)
  } catch (err) {
    console.error('Error:', err)
  }
}

main()
