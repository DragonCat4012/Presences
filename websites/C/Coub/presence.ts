interface PageContext {
  middleware: (ref: Window, ...args: unknown[]) => boolean;
  exec: (
    context: Presence,
    data: PresenceData,
    options?: { [key: string]: unknown }
  ) => Promise<PresenceData> | PresenceData;
}
interface LocalizedStrings {
  [key: string]: string;
}

interface ExecutionArguments {
  showWatch?: boolean;
  showBridge?: boolean;
  strings: LocalizedStrings;
  [key: string]: unknown;
}

function getQuery() {
  const queryString = location.search.split("?", 2),
    query =
      queryString && queryString.length > 0 && queryString[1]
        ? queryString[1].split("&").reduce(function (l, r) {
            const entry = r ? r.split("=", 2) : null;
            if (entry == null) return l;
            return Object.assign(l, { [entry[0]]: entry[1] });
          }, {})
        : {};
  return query;
}
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
const matchYoutubeUrl = (url: string): boolean =>
  !!url.match(
    /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/gm
  );
function parseBridgeUrl(id: string) {
  return `coubdl-bridge://${id}`;
}
function getSourceLink(url: string): { label: string; url: string }[] {
  if (!url) return [];
  if (matchYoutubeUrl(url)) {
    return [
      {
        label: "Watch Youtube Source",
        url
      }
    ];
  }
  return [];
}
(function () {
  const pages: PageContext[] = [
      {
        middleware: (ref) =>
          !!ref.location.pathname.match(
            /^\/(hot|rising|fresh|feed|rising|stories|random|bookmarks|likes|weekly|best|stories|royal\.coubs)/gi
          ) || ref.location.pathname === "/",
        exec: (
          context,
          data,
          { showWatch, showBridge }: ExecutionArguments
        ) => {
          if (!context) return null;
          const activeMedia = document.querySelector<HTMLElement>(
            ".coub[coub-block].active"
          );
          if (!activeMedia) return null;
          const title = activeMedia
              .querySelector(".description__title")?.textContent?.trim(),
            activeTab =
              document.querySelector<HTMLElement>(
                ".page__content .page-menu > .page-menu__inner > .page-menu__item.-active"
              ) ||
              document.querySelector<HTMLElement>(
                ".best2020__container .page-menu > .page-menu__inner > .page-menu__item.-active"
              ) ||
              document.querySelector<HTMLElement>(
                ".page__content .story__header"
              ),
            isWeekly = !!document.querySelector(
              ".page__content .page-menu.weekly__menu"
            ),
            isBestOfTheYear = location.pathname.startsWith("/best"),
            isCoubPicks = location.pathname.startsWith("/royal.coubs"),
            isLiked = !!activeMedia.querySelector(
              ".coub__like-button[widget-like-button].-on"
            ),
            activeTabTitle =
              activeTab?.textContent?.trim() ||
              activeTab?.dataset?.title ||
              "Feed";
          if (!title) return null;
          const pageType = document
            .querySelector(".page__content")
            ?.getAttributeNames()
            ?.map((x) => x.match(/^pages-(\w+)-page/i))
            .filter((x) => !!x && x.length > 1 && x[1])
            .map((x) => capitalizeFirstLetter(x[1]));
          data.state =
            `Browsing ${
              isCoubPicks && activeTabTitle.match(/^(\w+)/gi)
                ? activeTabTitle.match(/^(\w+)/gi)[0]
                : activeTabTitle
            }` +
            (pageType?.length > 0 &&
            activeTabTitle.toLowerCase() !== pageType[0].toLowerCase()
              ? ` in ${pageType[0]}`
              : isWeekly
              ? " in Weekly"
              : isBestOfTheYear
              ? " in Best of the Year"
              : isCoubPicks
              ? " in Coub Picks"
              : "");
          data.details = `${title}${isLiked ? " (❤)" : ""}`;
          const sourceLink = activeMedia.querySelector<HTMLAnchorElement>(
            ".description__stamp a.description__stamp__source"
          );
          data.buttons = [];
          if (showWatch)
            data.buttons.push(
              ...[
                ...getSourceLink(sourceLink?.href),
                {
                  label: "Watch on Coub",
                  url: `${document.location.origin}/view/${activeMedia.dataset.permalink}`
                }
              ]
            );
          if (showBridge)
            data.buttons.push({
              label: "Download via Bridge",
              url: parseBridgeUrl(activeMedia.dataset.permalink)
            });
          return data;
        }
      },
      {
        middleware: (ref) =>
          !!ref.document.querySelector(".hero-cover[channel-id]"),
        exec: (
          context,
          data,
          { showWatch, showBridge }: ExecutionArguments
        ) => {
          if (!context) return null;
          const activeMedia = document.querySelector<HTMLElement>(
            ".coub[coub-block].active"
          );
          if (!activeMedia) return null;
          const title = activeMedia
              .querySelector(".description__title")
              .textContent?.trim(),
            userName = document.querySelector<HTMLHeadingElement>(
              ".channel__description > h1[title]"
            ).title,
            activeTab =
              document.querySelector<HTMLElement>(
                ".page__content .page-menu > .page-menu__inner > .page-menu__item.-active"
              ) ||
              document.querySelector<HTMLElement>(
                ".best2020__container .page-menu > .page-menu__inner > .page-menu__item.-active"
              ) ||
              document.querySelector<HTMLElement>(
                ".page__content .story__header"
              ),
            isLiked = !!activeMedia.querySelector(
              ".coub__like-button[widget-like-button].-on"
            ),
            activeTabTitle =
              activeTab?.textContent.trimStart().split("\n")[0]?.trim() ||
              activeTab?.dataset?.title ||
              "Feed";
          if (!title || !userName) return null;
          data.state = `Browsing ${activeTabTitle} from ${userName}`;
          data.details = `${title}${isLiked ? " (❤)" : ""}`;
          const sourceLink = activeMedia.querySelector<HTMLAnchorElement>(
            ".description__stamp a.description__stamp__source"
          );
          data.buttons = [];
          if (showWatch)
            data.buttons.push(
              ...[
                ...getSourceLink(sourceLink?.href),
                {
                  label: "Watch on Coub",
                  url: `${document.location.origin}/view/${activeMedia.dataset.permalink}`
                },
                {
                  label: "View Profile",
                  url: `${document.location.origin}/${
                    document.location.pathname.split("/")[1]
                  }`
                }
              ]
            );
          if (showBridge)
            data.buttons.push({
              label: "Download via Bridge",
              url: parseBridgeUrl(activeMedia.dataset.permalink)
            });
          return data;
        }
      },
      {
        middleware: (ref) => !!ref.location.pathname.match(/^\/view\/(.*)/gi),
        exec: (
          context,
          data,
          { strings, showBridge, showWatch }: ExecutionArguments
        ) => {
          if (!context) return null;
          const activeMedia = document.querySelector<HTMLElement>(
            ".coub[coub-block]"
          );
          if (!activeMedia) return null;
          const title = activeMedia
              .querySelector(".coub__description h5.description__title")
              ?.textContent?.trim(),
            isLiked = !!activeMedia.querySelector(
              ".coub__like-button[widget-like-button].-on"
            );

          if (!title) return null;
          data.state = strings.watching;
          data.details = `${title}${isLiked ? " (❤)" : ""}`;
          const sourceLink = activeMedia.parentElement.querySelector<HTMLAnchorElement>(
            `.coub__info .media-block__item > a[type="embedPopup"]`
          );
          data.buttons = [];
          if (showWatch)
            data.buttons.push(
              ...[
                ...getSourceLink(sourceLink?.href),
                {
                  label: "Watch on Coub",
                  url: document.location.href
                }
              ]
            );
          if (showBridge)
            data.buttons.push({
              label: "Download via Bridge",
              url: parseBridgeUrl(activeMedia.dataset.permalink)
            });
          return data;
        }
      },
      {
        middleware: (ref) => !!ref.location.pathname.match(/^\/(community)/gi),
        exec: (
          context,
          data,
          { showWatch, showBridge }: ExecutionArguments
        ) => {
          if (!context) return null;
          const communityParent = document.querySelector(
            ".hot__community[data-community-id]"
          );
          if (!communityParent) return null;
          const activeMedia = document.querySelector<HTMLElement>(
            ".coub.active"
          );
          if (!activeMedia) return null;
          const communityTitle = communityParent
              .querySelector(".description > .title > h2")
              ?.textContent?.trim(),
            title = activeMedia
              .querySelector(".description__title")
              ?.textContent?.trim(),
            activeTabTitle =
              communityParent.parentElement.querySelector<HTMLElement>(
                ".page-menu.hot__menu > .page-menu__inner > .page-menu__item.-active"
              )?.dataset?.title || "Hot";

          if (!communityTitle || !title) return null;
          data.state = `Browsing ${communityTitle} in ${activeTabTitle}`;
          data.details = `${title}`;
          const sourceLink = activeMedia.querySelector<HTMLAnchorElement>(
            ".description__stamp a.description__stamp__source"
          );
          data.buttons = [];
          if (showWatch)
            data.buttons.push(
              ...[
                ...getSourceLink(sourceLink?.href),
                {
                  label: "Watch on Coub",
                  url: `${document.location.origin}/view/${activeMedia.dataset.permalink}`
                }
              ]
            );

          if (showBridge)
            data.buttons.push({
              label: "Download via Bridge",
              url: parseBridgeUrl(activeMedia.dataset.permalink)
            });
          return data;
        }
      },
      {
        middleware: (ref) => !!ref.window,
        exec: (
          context,
          data,
          { strings }: { strings: { browsing: string } }
        ) => {
          if (!context) return null;
          data.state = strings.browsing;
          data.details = "";
          return data;
        }
      }
    ],
    presence = new Presence({
      clientId: "818598086984728576"
    });

  (function (app: Presence) {
    app.on("UpdateData", async () => {
      const presenceData: PresenceData = {
        largeImageKey: "logo",
        largeImageText: "Coub"
      } as PresenceData;
      if (document.location.hostname == "coub.com") {
        const query: { [key: string]: unknown } = getQuery(),
          strings: { [key: string]: string } = await app.getStrings({
            play: "presence.playback.playing",
            pause: "presence.playback.paused",
            browsing: "presence.activity.browsing",
            searching: "presence.activity.searching",
            watching: "presence.playback.playing"
          }),
          context = pages.find((x) => x.middleware(window, [query]));
        if (!context) return false;

        const result = Promise.resolve(
          context.exec(app, presenceData, {
            strings,
            query,
            showWatch: await app
              .getSetting("show_button_watching")
              .then((x) => !!x)
              .catch(() => true),
            showBridge: await app
              .getSetting("show_coubbridge")
              .then((x) => !!x)
              .catch(() => false)
          })
        );
        return result.then((data) => {
          if (!data) {
            presence.setTrayTitle();
            presence.setActivity({
              largeImageKey: "logo",
              state: strings.browsing
            });
          } else {
            if (data.details) presence.setActivity(data);
            if (data.buttons && data.buttons.length === 0) delete data.buttons;
          }
          return data;
        });
      }
    });
  })(presence);
})();
