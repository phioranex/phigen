import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateChangelog(
  owner: string,
  repo: string,
  dateFrom: string,
  dateTo: string,
  commits: string[]
): Promise<string> {
  const commitList = commits.join("\n");

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a technical writer. Given the following git commit messages, generate a clean, human-readable changelog grouped into these sections:
- ✨ New Features
- 🐛 Bug Fixes
- 💥 Breaking Changes
- 🔧 Improvements
- 📝 Other

Rules:
- Ignore commits like "fix typo", "wip", "test", "merge branch" unless meaningful
- Rewrite commit messages into plain English a non-technical person can understand
- Keep each item to one sentence
- If a section has no items, omit it entirely
- Output in clean Markdown only

Repository: ${owner}/${repo}
Date range: ${dateFrom} to ${dateTo}

Commits:
${commitList}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response from Claude");

  return block.text;
}
