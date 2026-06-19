const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
let genAI;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn('Warning: GEMINI_API_KEY is missing from environment variables.');
}

/**
 * Classify a batch of comments into Sentiment and Category
 * @param {Array} comments - List of parsed comments { id, text }
 * @returns {Promise<Array>} - List of comments with analysis { id, sentiment, category }
 */
async function classifyCommentsBatch(comments, retries = 3) {
  if (!genAI) {
    throw new Error('Gemini AI client is not initialized due to missing API Key.');
  }
  if (!comments || comments.length === 0) return [];

  // Format comments into a clear list for the prompt
  const commentsFormatted = comments.map(c => `ID: ${c.id}\nText: ${c.text}`).join('\n---\n');

  const prompt = `
You are an expert NLP classifier. You will categorize YouTube comments and perform sentiment analysis.
For each comment, output an object with exactly 3 fields:
1. "id": the Comment ID
2. "sCode": 'POS' (Positive), 'NEU' (Neutral), or 'NEG' (Negative)
3. "cCode": 'Q' (Question), 'F' (Feedback), 'PR' (Praise), or 'NO' (Noise)

Noise category covers low-value spam, self-promotion, or short generic phrases like "nice", "ok", "lol".

Input comments list:
${commentsFormatted}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              sCode: { type: SchemaType.STRING },
              cCode: { type: SchemaType.STRING }
            },
            required: ["id", "sCode", "cCode"]
          }
        }
      }
    });

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    if (!textResponse) {
      throw new Error('Empty response from Gemini');
    }

    const rawClassifications = JSON.parse(textResponse.trim());
    
    // Decode codes back to full strings
    const sentimentMap = { POS: 'Positive', NEU: 'Neutral', NEG: 'Negative' };
    const categoryMap = { Q: 'Question', F: 'Feedback', PR: 'Praise', NO: 'Noise' };

    return rawClassifications.map(item => {
      return {
        id: item.id,
        sentiment: sentimentMap[item.sCode] || 'Neutral',
        category: categoryMap[item.cCode] || 'Noise'
      };
    });
  } catch (error) {
    console.error(`Error in classifyCommentsBatch (Retries left: ${retries}):`, error.message || error);
    
    // Check if it's a 429 Too Many Requests rate limit
    if ((error.status === 429 || (error.message && error.message.includes('429'))) && retries > 0) {
      console.log('Rate limit hit (429). Waiting 8 seconds before retrying...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      return classifyCommentsBatch(comments, retries - 1);
    }

    // Return empty fallback tags so backend doesn't crash on permanent error
    return comments.map(c => ({
      id: c.id,
      sentiment: 'Neutral',
      category: 'Noise'
    }));
  }
}

/**
 * Generate a high-level executive summary of the video comments
 * @param {Array} comments - List of comments
 * @returns {Promise<string>} - Markdown summary
 */
async function generateVideoSummary(comments) {
  if (!genAI) {
    throw new Error('Gemini AI client is not initialized due to missing API Key.');
  }
  if (!comments || comments.length === 0) {
    return 'No comments available to summarize.';
  }

  // Pick top 80 comments (high-impact or high-like counts) to avoid token limits
  const topCommentsText = comments
    .slice(0, 80)
    .map(c => `- ${c.text}`)
    .join('\n');

  const prompt = `
You are an expert Audience Insights Manager analyzing comment feedback for a creator's video.
Generate a structured executive summary in clean Markdown from the following comments list:

${topCommentsText}

Format the summary exactly like this:
### 📊 Audience Sentiment & Feedback Summary

* **General Consensus:** (1-2 sentences summarizing the general vibe and reception)
* **What They Loved:** (Bullet points listing the top 3 aspects the audience highly praised)
* **Critiques & Suggestions:** (Bullet points listing the top 3 complaints, questions, or improvements)
`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    return result.response.text() || 'Failed to generate summary.';
  } catch (error) {
    console.error('Error generating video summary:', error);
    return 'Error generating comment summary.';
  }
}

module.exports = {
  classifyCommentsBatch,
  generateVideoSummary
};
