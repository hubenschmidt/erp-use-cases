import { getJson } from 'serpapi';
import { createAgent } from '../lib/agent.js';
import { WorkerResult } from '../models.js';
import { SEARCH_WORKER_PROMPT } from '../prompts/workers/search.js';
import { models } from '../llm-models/index.js';

const apiKey = process.env.SERPAPI_KEY ?? '';

const agent = createAgent({
  name: 'SearchWorker',
  instructions: SEARCH_WORKER_PROMPT,
  model: models.workers.search,
});

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

const search = async (query: string, numResults: number = 5): Promise<SearchResult[]> => {
  if (!apiKey) {
    return [{ title: '', link: '', snippet: 'SERPAPI_KEY not configured' }];
  }

  const results = await getJson({
    q: query,
    api_key: apiKey,
    num: numResults,
  });

  const organicResults = results.organic_results ?? [];
  return organicResults.slice(0, numResults).map((r: Record<string, string>) => ({
    title: r.title ?? '',
    link: r.link ?? '',
    snippet: r.snippet ?? '',
  }));
};

const formatResults = (results: SearchResult[]): string => {
  return results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.link}\n   ${r.snippet}`)
    .join('\n\n');
};

export const executeSearch = async (
  taskDescription: string,
  parameters: Record<string, unknown>,
  feedback?: string
): Promise<WorkerResult> => {
  console.log('🔎 SEARCH_WORKER: Starting execution');
  console.log(`   Task: ${taskDescription.slice(0, 80)}...`);
  if (feedback) {
    console.log('   With feedback from previous attempt');
  }

  try {
    const query = (parameters.query as string) ?? taskDescription;
    const numResults = (parameters.num_results as number) ?? 5;

    console.log(`🔎 SEARCH_WORKER: Searching for '${query}' (${numResults} results)`);
    const searchResults = await search(query, numResults);

    if (searchResults[0]?.snippet === 'SERPAPI_KEY not configured') {
      console.error('❌ SEARCH_WORKER: Search API error: SERPAPI_KEY not configured');
      return {
        success: false,
        output: '',
        error: 'SERPAPI_KEY not configured',
      };
    }

    console.log(`✓ SEARCH_WORKER: Got ${searchResults.length} results`);

    const feedbackSection = feedback ? `Previous feedback to address: ${feedback}` : '';
    const context = `Task: ${taskDescription}

Search Results:
${formatResults(searchResults)}

${feedbackSection}

Synthesize these results into a clear, informative response.`;

    const result = await agent.run(context);

    console.log('✓ SEARCH_WORKER: Execution complete');
    return {
      success: true,
      output: result.finalOutput,
      error: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ SEARCH_WORKER: Failed with error: ${errorMsg}`);
    return {
      success: false,
      output: '',
      error: errorMsg,
    };
  }
};
