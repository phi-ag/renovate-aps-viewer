/// NOTE: Hard coded magic value, see https://aps.autodesk.com/params/custom.js
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

interface Release {
  version: string;
  releaseTimestamp: Date;
}

class ElementHandler {
  readonly releases: Release[] = [];

  readonly #versionRegex = new RegExp(/^\d+\.\d+\.\d+$/);

  readonly #releaseDateRegex = new RegExp(
    /^Release Date:? (?<month>\d{1,2})[\/-](?<day>\d{1,2})[\/-](?<year>\d{4})$/
  );

  #currentVersion: string | null = null;

  text({ text }: { text: string }) {
    if (this.#versionRegex.test(text)) {
      if (this.#currentVersion !== null) {
        console.warn(`Missing release date for version '${this.#currentVersion}'`);
      }

      this.#currentVersion = text;
      return;
    }

    const releaseDate = this.#releaseDateRegex.exec(text)?.groups;
    if (releaseDate && releaseDate.day && releaseDate.month && releaseDate.year) {
      if (this.#currentVersion === null) {
        console.warn(`Missing version for release date '${text}'`);
        return;
      }

      const year = parseInt(releaseDate.year);
      const month = parseInt(releaseDate.month);
      const day = parseInt(releaseDate.day);

      this.releases.push({
        version: this.#currentVersion,
        releaseTimestamp: new Date(Date.UTC(year, month - 1, day))
      });

      this.#currentVersion = null;
    }
  }
}

const fetchReleases = async (): Promise<Release[]> => {
  const configResponse = await fetch(configUrl);
  if (!configResponse.ok)
    throw Error(`Failed to fetch config ${await configResponse.text()}`);

  const config = await configResponse.json<Config>();

  const history = config?.children?.find((c) => c.url_path === "change_history");
  if (!history) throw Error("Missing change history");

  const source = history.children?.find((c) => c.url_path === "changelog_v7")?.source;
  if (!source) throw Error("Missing changelog source");

  const changelogUrl = `https://developer.doc.autodesk.com/${magic}/${source}`;
  const changelog = await fetch(changelogUrl);
  if (!changelog.ok) throw Error(`Failed to fetch changelog ${await changelog.text()}`);

  const handler = new ElementHandler();
  await new HTMLRewriter()
    .on("h2", handler)
    .on("em", handler)
    .transform(changelog)
    .arrayBuffer();

  return handler.releases;
};

export default {
  async fetch(): Promise<Response> {
    try {
      const releases = await fetchReleases();

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
