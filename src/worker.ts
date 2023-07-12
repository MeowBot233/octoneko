import { Octokit } from "octokit";
/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
    pushAPI?: string;
    pushToken?: string;
    pushThreadID?: string;
    octoneko: KVNamespace;
    // Example binding to KV. Learn more at https://developwrers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket;
    //
    // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
    // MY_SERVICE: Fetcher;
    //
    // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
    // MY_QUEUE: Queue;
    //
    // Example binding to a D1 Database. Learn more at https://developers.cloudflare.com/workers/platform/bindings/#d1-database-bindings
    // DB: D1Database
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const logs = await check(env);
        return new Response(logs.join('\n'), { status: 200 });
    },
    // The scheduled handler is invoked at the interval set in our wrangler.toml's
    // [[triggers]] configuration.
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        await check(env);
    },
};

async function check(env: Env): Promise<string[]> {
    const logs: string[] = [];
    if(!env.pushToken) return logs;
    const octokit = new Octokit();
    const repos = (await env.octoneko.get('repos'))?.split('\n') || '';
    for(let i = 0; i < repos.length; i++) {
        if(!repos[i]) continue;
        logs.push(repos[i]);
        const url = new URL(repos[i]);
        const paths = url.pathname.split('/');
        const owner = paths[1];
        const repo = paths[2];
        if(!owner || !repo) continue;
        logs.push(`${owner}/${repo}`);
        const res = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
            owner,
            repo,
        });
        const time = res.data.published_at;
        if(!time) continue;
        const previousUpdate = await env.octoneko.get(`${owner}/${repo}`);
        logs.push(`previous update: ${previousUpdate}`);
        logs.push(`latest update: ${time}`);
        if(!previousUpdate) {
            logs.push(`no previous update time found, setting to ${time}`);
            await env.octoneko.put(`${owner}/${repo}`, time);
            continue;
        }
        const newDate = new Date(time);
        const currentDate = new Date(previousUpdate);
        if(newDate > currentDate) {
            logs.push(`new release found for ${owner}/${repo}`);
            env.octoneko.put(`${owner}/${repo}`, time);
            await push(env, {
                owner,
                repo,
                ...res.data
            })
        }
    }
    return logs;
}

async function push(env: Env, data: releaseData) {
    const api = env.pushAPI || 'https://push.meowbot.page/push';
    const text =
`
<b>New release from ${data.owner}/${data.repo}</b>
<b>${data.name + ' ' || ''} ${data.tag_name}</b>
${data.html_url}
`;
    const buttons = [[
        {
            text: 'View the project',
            url: `https://github.com/${data.owner}/${data.repo}/`
        },
        {
            text: 'View this release',
            url: data.html_url
        }
    ]]
    const body = {
        token: env.pushToken,
        text,
        thread_id: env.pushThreadID,
        html: true,
        buttons
    }
    return await fetch(api, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
}

type releaseData = {
    owner: string;
    repo: string;
    tag_name: string;
    name: string | null;
    html_url: string;
}
