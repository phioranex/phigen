export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  updated_at: string;
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

export async function fetchUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const data: GitHubRepo[] = await res.json();
    if (data.length === 0) break;

    repos.push(...data);
    page++;

    if (data.length < 100) break;
  }

  return repos;
}

export async function fetchCommits(
  accessToken: string,
  owner: string,
  repo: string,
  since: string,
  until: string
): Promise<GitHubCommit[]> {
  const commits: GitHubCommit[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&until=${until}&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const data: GitHubCommit[] = await res.json();
    if (data.length === 0) break;

    commits.push(...data);
    page++;

    if (data.length < 100) break;
  }

  return commits;
}
