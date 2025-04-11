class ElementHandler {
  readonly versions = new Set<string>();
  readonly #versionRegex = new RegExp(/^\d+\.\d+\.\d+$/);

  text({ text }: { text: string }) {
    if (this.#versionRegex.test(text)) {
      this.versions.add(text);
    }
  }
}

const magic = "bPlouYTd";

const configUrl = `https://developer.doc.config.autodesk.com/${magic}/viewer_v7.json`;

const sourceUrl =
  "https://aps.autodesk.com/en/docs/viewer/v7/change_history/changelog_v7/";

const homepage = "https://github.com/phi-ag/renovate-aps-viewer";

interface Config {
  children: [
    {
      url_path: string;
      children: [
        {
          url_path: string;
          source: string;
        }
      ];
    }
  ];
}

const fetchVersions = async (): Promise<string[]> => {
  const configResponse = await fetch(configUrl);
  if (!configResponse.ok)
    throw Error(`Failed to fetch config ${await configResponse.text()}`);

  const config = await configResponse.json<Config>();

  const history = config?.children?.find((c) => c?.url_path === "change_history");
  if (!history) throw Error("Missing change history");

  const source = history.children?.find((c) => c?.url_path === "changelog_v7")?.source;
  if (!source) throw Error("Missing changelog source");

  const changelogUrl = `https://developer.doc.autodesk.com/${magic}/${source}`;
  const changelog = await fetch(changelogUrl);
  if (!changelog.ok) throw Error(`Failed to fetch changelog ${await changelog.text()}`);

  const handler = new ElementHandler();
  await new HTMLRewriter().on("h2", handler).transform(changelog).arrayBuffer();

  return Array.from(handler.versions);
};

export default {
  async fetch(): Promise<Response> {
    try {
      const versions = await fetchVersions();
      const releases = versions.map((version) => ({ version }));

      return Response.json({
        releases,
        sourceUrl,
        homepage
      });
    } catch (e) {
      if (e instanceof Error) {
        return new Response(e.message, { status: 500 });
      }
      throw e;
    }
  }
} as ExportedHandler<Env>;
