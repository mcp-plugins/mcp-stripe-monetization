# Framework Integrations for MCP Stripe Monetization

This guide shows how to integrate MCP Stripe monetization with popular AI frameworks and platforms.

---

## 🤖 Vercel AI SDK Integration

The [Vercel AI SDK](https://ai-sdk.dev/) is a popular framework for building AI applications. Here's how to add monetization to your AI SDK apps.

### Basic Setup

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createStripeMonetizationPlugin, createBasicSetup } from 'mcp-stripe-monetization';

// Configure monetization
const plugin = createStripeMonetizationPlugin(createBasicSetup({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultPrice: 100, // $1.00 per request
  toolPrices: {
    'gpt-4': 500,           // $5.00 per GPT-4 request
    'gpt-3.5-turbo': 100,   // $1.00 per GPT-3.5 request
    'claude-3': 300,        // $3.00 per Claude request
    'image-generation': 200  // $2.00 per image
  }
}));

export async function POST(req: Request) {
  const { messages, userId, model = 'gpt-3.5-turbo' } = await req.json();

  try {
    // Check billing before API call
    const billingCheck = await plugin.beforeToolCall({
      toolName: model,
      args: { messages, model },
      metadata: { userId, requestId: crypto.randomUUID() }
    });

    if (billingCheck?.blocked) {
      return Response.json({
        error: 'Payment required',
        message: 'Insufficient credits for this AI model',
        pricing: {
          required: billingCheck.required,
          available: billingCheck.available,
          model: model
        },
        checkoutUrl: `/api/stripe/checkout?model=${model}&userId=${userId}`
      }, { status: 402 });
    }

    // Make AI request
    const result = await streamText({
      model: openai(model),
      messages,
    });

    // Process billing after successful request
    await plugin.afterToolCall({
      toolName: model,
      args: { messages, model },
      metadata: { userId, requestId: crypto.randomUUID() }
    }, {
      result: {
        content: [{ type: 'text', text: 'AI response generated' }],
        _meta: {}
      }
    });

    return result.toAIStreamResponse();

  } catch (error) {
    return Response.json({ error: 'AI request failed' }, { status: 500 });
  }
}
```

### Frontend Integration with AI SDK

```tsx
// components/ChatInterface.tsx
import { useChat } from 'ai/react';
import { useState } from 'react';

export default function ChatInterface() {
  const [credits, setCredits] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: {
      userId: 'user_123',
      model: 'gpt-4'
    },
    onError: async (error) => {
      // Handle payment required errors
      if (error.message.includes('Payment required')) {
        const errorData = JSON.parse(error.message);
        setShowPayment(true);
        
        // Show payment modal or redirect to checkout
        if (errorData.checkoutUrl) {
          window.location.href = errorData.checkoutUrl;
        }
      }
    }
  });

  const buyCredits = async (model: string) => {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_123',
        model,
        quantity: 10 // Buy 10 credits for this model
      })
    });
    
    const { checkoutUrl } = await response.json();
    window.location.href = checkoutUrl;
  };

  return (
    <div className="chat-container">
      {/* Credits Display */}
      <div className="credits-bar">
        💰 Credits: ${(credits / 100).toFixed(2)}
        <button onClick={() => buyCredits('gpt-4')}>
          Buy GPT-4 Credits ($5 each)
        </button>
      </div>

      {/* Chat Messages */}
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
        {isLoading && <div className="loading">AI is thinking...</div>}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask GPT-4 anything... ($5.00 per message)"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send (GPT-4)
        </button>
      </form>

      {/* Payment Required Modal */}
      {showPayment && (
        <div className="payment-modal">
          <div className="modal-content">
            <h3>💳 Payment Required</h3>
            <p>You need credits to use GPT-4</p>
            <button onClick={() => buyCredits('gpt-4')}>
              Buy Credits ($5.00)
            </button>
            <button onClick={() => setShowPayment(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Advanced AI SDK Integration

```typescript
// lib/ai-with-billing.ts
import { createAI, getMutableAIState, streamUI } from 'ai/rsc';
import { createStripeMonetizationPlugin } from 'mcp-stripe-monetization';

// Create reusable AI actions with billing
export const AI = createAI({
  actions: {
    generateText: async (prompt: string, model: string, userId: string) => {
      // Check billing first
      const canProceed = await checkBilling(userId, model);
      if (!canProceed) {
        return {
          error: 'Payment required',
          checkoutUrl: `/checkout?model=${model}&userId=${userId}`
        };
      }

      // Generate AI response
      const result = await streamUI({
        model: openai(model),
        prompt,
        text: ({ content }) => <div className="ai-response">{content}</div>
      });

      // Process billing
      await processBilling(userId, model);
      
      return result;
    },

    generateImage: async (prompt: string, userId: string) => {
      const canProceed = await checkBilling(userId, 'image-generation');
      if (!canProceed) {
        return {
          error: 'Payment required',
          checkoutUrl: `/checkout?model=image-generation&userId=${userId}`
        };
      }

      // Generate image with DALL-E
      const image = await openai.images.generate({
        prompt,
        size: '1024x1024'
      });

      await processBilling(userId, 'image-generation');

      return (
        <div className="generated-image">
          <img src={image.data[0].url} alt={prompt} />
          <p>Generated image: {prompt}</p>
        </div>
      );
    }
  }
});

async function checkBilling(userId: string, toolName: string): Promise<boolean> {
  const result = await plugin.beforeToolCall({
    toolName,
    args: {},
    metadata: { userId }
  });
  
  return !result?.blocked;
}

async function processBilling(userId: string, toolName: string): Promise<void> {
  await plugin.afterToolCall({
    toolName,
    args: {},
    metadata: { userId }
  }, {
    result: { content: [], _meta: {} }
  });
}
```

---

## 🦜 LangChain Integration

[LangChain](https://langchain.com/) is a framework for building applications with large language models.

### LangChain with Monetization

```typescript
// lib/monetized-langchain.ts
import { ChatOpenAI } from '@langchain/openai';
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import { createStripeMonetizationPlugin } from 'mcp-stripe-monetization';

class MonetizedLangChain {
  private plugin: any;
  private llm: ChatOpenAI;

  constructor() {
    this.plugin = createStripeMonetizationPlugin(config);
    this.llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7
    });
  }

  async createChain(templateString: string, toolName: string) {
    const prompt = PromptTemplate.fromTemplate(templateString);
    
    return new LLMChain({
      llm: this.llm,
      prompt,
      callbacks: [
        {
          handleLLMStart: async (llm, prompts, metadata) => {
            // Check billing before LLM call
            const result = await this.plugin.beforeToolCall({
              toolName,
              args: { prompts, model: llm.name },
              metadata: metadata || {}
            });

            if (result?.blocked) {
              throw new Error(JSON.stringify({
                error: 'Payment required',
                required: result.required,
                available: result.available
              }));
            }
          },
          
          handleLLMEnd: async (output, metadata) => {
            // Process billing after successful LLM call
            await this.plugin.afterToolCall({
              toolName,
              args: {},
              metadata: metadata || {}
            }, {
              result: {
                content: [{ type: 'text', text: output.generations[0][0].text }],
                _meta: {}
              }
            });
          }
        }
      ]
    });
  }
}

// Usage example
const monetizedChain = new MonetizedLangChain();

const summarizeChain = await monetizedChain.createChain(
  "Summarize the following text: {text}",
  "text-summarization"
);

// API endpoint
export async function POST(req: Request) {
  const { text, userId } = await req.json();

  try {
    const result = await summarizeChain.call({ 
      text,
      metadata: { userId }
    });

    return Response.json({ summary: result.text });
  } catch (error) {
    if (error.message.includes('Payment required')) {
      const errorData = JSON.parse(error.message);
      return Response.json(errorData, { status: 402 });
    }
    throw error;
  }
}
```

### LangChain Agents with Billing

```typescript
// lib/monetized-agents.ts
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { Calculator } from '@langchain/community/tools/calculator';
import { SerpAPI } from '@langchain/community/tools/serpapi';

class MonetizedAgent {
  private plugin: any;
  
  constructor() {
    this.plugin = createStripeMonetizationPlugin(config);
  }

  async createAgent(userId: string) {
    const llm = new ChatOpenAI({ modelName: 'gpt-3.5-turbo' });
    
    // Wrap tools with billing
    const tools = [
      this.wrapToolWithBilling(new Calculator(), 'calculator', userId),
      this.wrapToolWithBilling(new SerpAPI(), 'web-search', userId)
    ];

    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt: "You are a helpful AI assistant with access to tools."
    });

    return new AgentExecutor({
      agent,
      tools,
      verbose: true
    });
  }

  private wrapToolWithBilling(tool: any, toolName: string, userId: string) {
    const originalCall = tool.call.bind(tool);
    
    tool.call = async (input: string) => {
      // Check billing before tool use
      const billingResult = await this.plugin.beforeToolCall({
        toolName,
        args: { input },
        metadata: { userId }
      });

      if (billingResult?.blocked) {
        throw new Error(`Payment required for ${toolName}. Need $${(billingResult.required / 100).toFixed(2)}`);
      }

      // Execute original tool
      const result = await originalCall(input);

      // Process billing
      await this.plugin.afterToolCall({
        toolName,
        args: { input },
        metadata: { userId }
      }, {
        result: {
          content: [{ type: 'text', text: result }],
          _meta: {}
        }
      });

      return result;
    };

    return tool;
  }
}

// Usage in API route
export async function POST(req: Request) {
  const { query, userId } = await req.json();
  
  const monetizedAgent = new MonetizedAgent();
  const agent = await monetizedAgent.createAgent(userId);

  try {
    const result = await agent.invoke({ input: query });
    return Response.json({ result: result.output });
  } catch (error) {
    if (error.message.includes('Payment required')) {
      return Response.json({
        error: 'Payment required',
        message: error.message,
        checkoutUrl: `/checkout?userId=${userId}`
      }, { status: 402 });
    }
    throw error;
  }
}
```

---

## 🤗 Hugging Face Transformers Integration

Monetize Hugging Face model usage with per-inference billing.

```typescript
// lib/monetized-hf.ts
import { pipeline, Pipeline } from '@xenova/transformers';
import { createStripeMonetizationPlugin } from 'mcp-stripe-monetization';

class MonetizedHuggingFace {
  private plugin: any;
  private pipelines: Map<string, Pipeline> = new Map();

  constructor() {
    this.plugin = createStripeMonetizationPlugin(createBasicSetup({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      defaultPrice: 50, // $0.50 per inference
      toolPrices: {
        'text-classification': 25,    // $0.25
        'sentiment-analysis': 25,     // $0.25
        'text-generation': 100,       // $1.00
        'summarization': 75,          // $0.75
        'translation': 50,            // $0.50
        'question-answering': 40,     // $0.40
        'image-classification': 30,   // $0.30
        'object-detection': 60        // $0.60
      }
    }));
  }

  async getPipeline(task: string, model?: string): Promise<Pipeline> {
    const key = `${task}-${model || 'default'}`;
    
    if (!this.pipelines.has(key)) {
      const pipe = await pipeline(task, model);
      this.pipelines.set(key, pipe);
    }
    
    return this.pipelines.get(key)!;
  }

  async runInference(
    task: string, 
    input: any, 
    userId: string, 
    model?: string
  ) {
    // Check billing before inference
    const billingResult = await this.plugin.beforeToolCall({
      toolName: task,
      args: { input, model },
      metadata: { userId, task, model }
    });

    if (billingResult?.blocked) {
      throw new Error(JSON.stringify({
        error: 'Payment required',
        task,
        required: billingResult.required,
        available: billingResult.available,
        checkoutUrl: `/checkout?task=${task}&userId=${userId}`
      }));
    }

    // Run inference
    const pipe = await this.getPipeline(task, model);
    const result = await pipe(input);

    // Process billing
    await this.plugin.afterToolCall({
      toolName: task,
      args: { input, model },
      metadata: { userId, task, model }
    }, {
      result: {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        _meta: { inferenceTime: Date.now() }
      }
    });

    return result;
  }
}

// API endpoints for different tasks
const hf = new MonetizedHuggingFace();

// Text Classification API
export async function POST(req: Request) {
  const { text, userId, model } = await req.json();

  try {
    const result = await hf.runInference(
      'text-classification',
      text,
      userId,
      model || 'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );

    return Response.json({
      classification: result,
      cost: 0.25, // $0.25 charged
      model: model || 'distilbert-base-uncased-finetuned-sst-2-english'
    });
  } catch (error) {
    if (error.message.includes('Payment required')) {
      return Response.json(JSON.parse(error.message), { status: 402 });
    }
    throw error;
  }
}

// Text Generation API  
export async function POST(req: Request) {
  const { prompt, userId, maxLength = 100 } = await req.json();

  try {
    const result = await hf.runInference(
      'text-generation',
      prompt,
      userId,
      'Xenova/gpt2'
    );

    return Response.json({
      generated_text: result[0].generated_text,
      cost: 1.00, // $1.00 charged
      tokens_generated: result[0].generated_text.length
    });
  } catch (error) {
    if (error.message.includes('Payment required')) {
      return Response.json(JSON.parse(error.message), { status: 402 });
    }
    throw error;
  }
}
```

---

## 🔥 LlamaIndex Integration

Monetize RAG (Retrieval-Augmented Generation) applications built with LlamaIndex.

```typescript
// lib/monetized-llamaindex.ts
import { VectorStoreIndex, SimpleDirectoryReader } from 'llamaindex';
import { OpenAI } from 'llamaindex/llm/openai';
import { createStripeMonetizationPlugin } from 'mcp-stripe-monetization';

class MonetizedLlamaIndex {
  private plugin: any;
  private index: VectorStoreIndex | null = null;
  private llm: OpenAI;

  constructor() {
    this.plugin = createStripeMonetizationPlugin(createBasicSetup({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      toolPrices: {
        'document-indexing': 100,     // $1.00 per document
        'vector-search': 25,          // $0.25 per search
        'rag-query': 150,             // $1.50 per RAG query
        'document-summary': 200       // $2.00 per summary
      }
    }));

    this.llm = new OpenAI({ model: 'gpt-3.5-turbo' });
  }

  async indexDocuments(documentPath: string, userId: string) {
    // Check billing for indexing
    const billingResult = await this.plugin.beforeToolCall({
      toolName: 'document-indexing',
      args: { documentPath },
      metadata: { userId }
    });

    if (billingResult?.blocked) {
      throw new Error('Payment required for document indexing');
    }

    // Load and index documents
    const documents = await new SimpleDirectoryReader().loadData(documentPath);
    this.index = await VectorStoreIndex.fromDocuments(documents);

    // Process billing
    await this.plugin.afterToolCall({
      toolName: 'document-indexing',
      args: { documentPath },
      metadata: { userId, documentCount: documents.length }
    }, {
      result: {
        content: [{ type: 'text', text: `Indexed ${documents.length} documents` }],
        _meta: { documentCount: documents.length }
      }
    });

    return {
      message: `Successfully indexed ${documents.length} documents`,
      cost: documents.length * 1.00 // $1.00 per document
    };
  }

  async query(question: string, userId: string) {
    if (!this.index) {
      throw new Error('No documents indexed. Please index documents first.');
    }

    // Check billing for RAG query
    const billingResult = await this.plugin.beforeToolCall({
      toolName: 'rag-query',
      args: { question },
      metadata: { userId }
    });

    if (billingResult?.blocked) {
      throw new Error(JSON.stringify({
        error: 'Payment required for RAG query',
        required: billingResult.required,
        available: billingResult.available,
        cost: '$1.50 per query'
      }));
    }

    // Execute RAG query
    const queryEngine = this.index.asQueryEngine({
      llm: this.llm
    });

    const response = await queryEngine.query(question);

    // Process billing
    await this.plugin.afterToolCall({
      toolName: 'rag-query',
      args: { question },
      metadata: { userId }
    }, {
      result: {
        content: [{ type: 'text', text: response.toString() }],
        _meta: { queryTime: Date.now() }
      }
    });

    return {
      answer: response.toString(),
      sources: response.sourceNodes?.map(node => ({
        content: node.node.getText(),
        score: node.score
      })),
      cost: 1.50 // $1.50 charged
    };
  }

  async summarizeDocuments(userId: string) {
    if (!this.index) {
      throw new Error('No documents indexed');
    }

    // Check billing
    const billingResult = await this.plugin.beforeToolCall({
      toolName: 'document-summary',
      args: {},
      metadata: { userId }
    });

    if (billingResult?.blocked) {
      throw new Error('Payment required for document summarization');
    }

    // Generate summary
    const queryEngine = this.index.asQueryEngine({
      llm: this.llm
    });

    const summary = await queryEngine.query(
      "Please provide a comprehensive summary of all the documents"
    );

    // Process billing
    await this.plugin.afterToolCall({
      toolName: 'document-summary',
      args: {},
      metadata: { userId }
    }, {
      result: {
        content: [{ type: 'text', text: summary.toString() }],
        _meta: {}
      }
    });

    return {
      summary: summary.toString(),
      cost: 2.00 // $2.00 charged
    };
  }
}

// API endpoints
const llamaIndex = new MonetizedLlamaIndex();

// Index documents endpoint
export async function POST(req: Request) {
  const { documentPath, userId } = await req.json();

  try {
    const result = await llamaIndex.indexDocuments(documentPath, userId);
    return Response.json(result);
  } catch (error) {
    if (error.message.includes('Payment required')) {
      return Response.json({
        error: error.message,
        checkoutUrl: `/checkout?service=document-indexing&userId=${userId}`
      }, { status: 402 });
    }
    throw error;
  }
}

// RAG query endpoint
export async function POST(req: Request) {
  const { question, userId } = await req.json();

  try {
    const result = await llamaIndex.query(question, userId);
    return Response.json(result);
  } catch (error) {
    if (error.message.includes('Payment required')) {
      const errorData = JSON.parse(error.message);
      return Response.json({
        ...errorData,
        checkoutUrl: `/checkout?service=rag-query&userId=${userId}`
      }, { status: 402 });
    }
    throw error;
  }
}
```

---

## ⚡ Next.js Integration

Complete Next.js application with monetized AI features.

```typescript
// app/api/ai/route.ts
import { createStripeMonetizationPlugin } from 'mcp-stripe-monetization';
import { openai } from '@ai-sdk/openai';

const plugin = createStripeMonetizationPlugin(config);

export async function POST(request: Request) {
  const { prompt, model, userId } = await request.json();

  // Check billing
  const billingResult = await plugin.beforeToolCall({
    toolName: model,
    args: { prompt },
    metadata: { userId }
  });

  if (billingResult?.blocked) {
    return new Response(JSON.stringify({
      error: 'Payment required',
      pricing: {
        model,
        cost: billingResult.required / 100,
        available: billingResult.available / 100
      }
    }), { 
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Make AI request
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }]
  });

  // Process billing
  await plugin.afterToolCall({
    toolName: model,
    args: { prompt },
    metadata: { userId }
  }, {
    result: {
      content: [{ type: 'text', text: response.choices[0].message.content }],
      _meta: { tokens: response.usage?.total_tokens }
    }
  });

  return Response.json({
    response: response.choices[0].message.content,
    usage: response.usage,
    cost: config.billing.toolPrices[model] / 100
  });
}
```

```tsx
// components/AIChat.tsx
'use client';

import { useState } from 'react';

export default function AIChat() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          model: 'gpt-4',
          userId: 'user_123'
        })
      });

      if (response.status === 402) {
        // Payment required
        const error = await response.json();
        const checkoutUrl = `/checkout?model=gpt-4&userId=user_123`;
        
        setMessages(prev => [...prev, {
          role: 'system',
          content: `💳 Payment required: ${error.pricing.cost} USD. Click here to buy credits: ${checkoutUrl}`
        }]);
        return;
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response
      }]);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Error: Failed to get AI response'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div>AI is thinking...</div>}
      </div>
      
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask GPT-4 anything... ($5.00 per message)"
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
```

---

## 🚀 Deployment Examples

### Vercel Deployment

```typescript
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "STRIPE_SECRET_KEY": "@stripe-secret-key",
    "STRIPE_PUBLISHABLE_KEY": "@stripe-publishable-key",
    "STRIPE_WEBHOOK_SECRET": "@stripe-webhook-secret"
  }
}
```

### Railway Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  ai-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres
      
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=ai_billing
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 📊 Usage Analytics

Track and analyze usage across all frameworks:

```typescript
// lib/analytics.ts
export async function getUsageAnalytics(userId: string, timeframe: string = 'month') {
  const plugin = getMonetizationPlugin();
  
  const analytics = await plugin.getAnalytics({
    userId,
    timeframe,
    groupBy: ['model', 'framework', 'feature']
  });

  return {
    totalSpent: analytics.totalRevenue / 100,
    totalCalls: analytics.totalCalls,
    averageCostPerCall: analytics.averageCostPerCall / 100,
    mostUsedModels: analytics.popularTools,
    spendingByFramework: {
      'vercel-ai-sdk': analytics.frameworkUsage['vercel-ai-sdk'] || 0,
      'langchain': analytics.frameworkUsage['langchain'] || 0,
      'huggingface': analytics.frameworkUsage['huggingface'] || 0,
      'llamaindex': analytics.frameworkUsage['llamaindex'] || 0
    },
    dailyUsage: analytics.dailyBreakdown
  };
}
```

This comprehensive framework integration guide shows developers exactly how to add monetization to their existing AI applications, regardless of which framework they're using! 🚀