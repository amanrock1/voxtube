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
 * @param {number} retries - Number of retries left
 * @param {string} modelName - Gemini model to use
 * @returns {Promise<Array>} - List of comments with analysis { id, sentiment, category }
 */
async function classifyCommentsBatch(comments, retries = 3, modelName = 'gemini-flash-latest') {
  if (!genAI) {
    throw new Error('Gemini AI client is not initialized due to missing API Key.');
  }
  if (!comments || comments.length === 0) return [];

  // \u2500\u2500\u2500 SECURITY: Truncate text to prevent prompt injection attacks \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // A malicious Reddit/YouTube comment like "Ignore all previous instructions..."
  // could try to hijack the AI. Capping text length limits the attack surface.
  const MAX_COMMENT_CHARS = 1000;
  const commentsFormatted = comments.map(c => `ID: ${c.id}\nText: ${String(c.text || '').slice(0, MAX_COMMENT_CHARS)}`).join('\n---\n');


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
      model: modelName,
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
    console.error(`Error in classifyCommentsBatch using ${modelName} (Retries left: ${retries}):`, error.message || error);
    
    // Check if it's a rate limit (429) or service unavailable (503) or generic fetch error
    const isRetryable = error.status === 429 || error.status === 503 || 
      (error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('fetch') || error.message.includes('demand') || error.message.includes('quota')));
      
    if (isRetryable) {
      if (modelName === 'gemini-flash-latest') {
        console.log(`Failed with gemini-flash-latest. Falling back to gemini-flash-lite-latest immediately...`);
        return classifyCommentsBatch(comments, retries, 'gemini-flash-lite-latest');
      }
      
      if (retries > 0) {
        const waitTime = Math.pow(2, 4 - retries) * 1000 + Math.floor(Math.random() * 1000);
        console.log(`Gemini API error/rate limit hit. Waiting ${waitTime}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return classifyCommentsBatch(comments, retries - 1, modelName);
      }
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
 * @param {number} retries - Number of retries left
 * @param {string} modelName - Gemini model to use
 * @returns {Promise<string>} - Markdown summary
 */
async function generateVideoSummary(comments, retries = 3, modelName = 'gemini-flash-latest') {
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
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text() || 'Failed to generate summary.';
  } catch (error) {
    console.error(`Error generating video summary using ${modelName} (Retries left: ${retries}):`, error.message || error);
    
    const isRetryable = error.status === 429 || error.status === 503 || 
      (error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('fetch') || error.message.includes('demand') || error.message.includes('quota')));
      
    if (isRetryable) {
      if (modelName === 'gemini-flash-latest') {
        console.log(`Failed with gemini-flash-latest in video summary. Falling back to gemini-flash-lite-latest immediately...`);
        return generateVideoSummary(comments, retries, 'gemini-flash-lite-latest');
      }

      if (retries > 0) {
        const waitTime = Math.pow(2, 4 - retries) * 1000 + Math.floor(Math.random() * 1000);
        console.log(`Gemini API error/rate limit hit in video summary. Waiting ${waitTime}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateVideoSummary(comments, retries - 1, modelName);
      }
    }
    
    return 'Error generating comment summary.';
  }
}

/**
 * Generate a high-level troubleshooting and solution summary of Reddit comments
 * @param {string} postTitle - The Reddit post title (problem description)
 * @param {Array} comments - Flattened comments array with parent_id relationships
 * @param {number} retries - Number of retries left
 * @param {string} modelName - Gemini model to use
 * @returns {Promise<string>} - Markdown summary
 */
async function generateRedditSummary(postTitle, comments, retries = 3, modelName = 'gemini-flash-latest') {
  if (!genAI) {
    throw new Error('Gemini AI client is not initialized due to missing API Key.');
  }
  if (!comments || comments.length === 0) {
    return 'No solutions or advice available in comments.';
  }

  // 1. Build a text-based hierarchy of comments to help the AI understand replies
  const commentMap = new Map();
  comments.forEach(c => commentMap.set(c.id, { ...c, replies: [] }));
  
  const rootComments = [];
  comments.forEach(c => {
    const mapped = commentMap.get(c.id);
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id).replies.push(mapped);
    } else {
      rootComments.push(mapped);
    }
  });

  // Limit to top 50 threads to prevent token bloating
  const serializedThreads = rootComments.slice(0, 50).map(root => {
    let threadStr = `- [Solution/Advice] (Score: ${root.like_count}): ${root.text}\n`;
    if (root.replies.length > 0) {
      root.replies.forEach(reply => {
        threadStr += `  ↳ [Community Reply] (Score: ${reply.like_count}): ${reply.text}\n`;
      });
    }
    return threadStr;
  }).join('\n---\n');

  const prompt = `
You are an expert Troubleshooting Analyst. You are analyzing a Reddit post discussing a technical problem or query.
Post Title/Question: "${postTitle}"

Review the following comment threads (solutions and community feedback replies indicating if they worked, caused issues, or failed):

${serializedThreads}

Generate a clear, structured troubleshooting summary in Markdown. Be concise and follow this exact format:

### 🛠️ Extracted Solutions & Advice Analysis

* **🟢 Good to Go (Working Solutions):**
  - **[Solution Name/Brief Title]:** [Explain what to do. Mention why the community recommends this, citing upvotes or positive feedback.]

* **🟡 Proceed with Caution (Partial/Risky advice):**
  - **[Advice/Solution Title]:** [Explain the advice. Highlight potential caveats, warning signs, or risks mentioned by replies.]

* **🔴 Not Recommended / Broken:**
  - **[Bad Solution/Idea]:** [Explain the proposed solution. Specifically detail why community replies say this does NOT work, is dangerous, or is outdated.]

### 📋 Recommended Action Plan (Steps to Try)
1. [Step 1: First and safest thing to try]
2. [Step 2: Second step if first fails]
3. [Step 3: Alternative/Advanced workaround]
`;

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text() || 'Failed to generate solution summary.';
  } catch (error) {
    console.error(`Error generating Reddit summary using ${modelName} (Retries left: ${retries}):`, error.message || error);
    
    const isRetryable = error.status === 429 || error.status === 503 || 
      (error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('fetch') || error.message.includes('demand') || error.message.includes('quota')));
      
    if (isRetryable) {
      if (modelName === 'gemini-flash-latest') {
        console.log(`Failed with gemini-flash-latest in Reddit summary. Falling back to gemini-flash-lite-latest immediately...`);
        return generateRedditSummary(postTitle, comments, retries, 'gemini-flash-lite-latest');
      }

      if (retries > 0) {
        const waitTime = Math.pow(2, 4 - retries) * 1000 + Math.floor(Math.random() * 1000);
        console.log(`Gemini API error/rate limit hit in Reddit summary. Waiting ${waitTime}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateRedditSummary(postTitle, comments, retries - 1, modelName);
      }
    }
    
    return 'Error generating troubleshooting summary from Reddit threads.';
  }
}

module.exports = {
  classifyCommentsBatch,
  generateVideoSummary,
  generateRedditSummary
};
