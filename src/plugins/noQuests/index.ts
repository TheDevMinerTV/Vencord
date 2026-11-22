/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { NavigationRouter } from "@webpack/common";

import managedStyle from "./style.css?managed";

const FRIENDS_PATH = "/channels/@me";
const QUEST_PATH_PREFIXES = ["/quest-home", "/discovery/quests"];

type HistoryWriter = History["pushState"];

const originalHistoryWriters: Partial<
    Record<"pushState" | "replaceState", HistoryWriter>
> = {};
let hasRedirectedOnStartup = false;

function isQuestPath(pathname: string) {
    return QUEST_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function pathnameOf(url: string | URL | null | undefined) {
    if (url == null) return location.pathname;
    return new URL(url, location.href).pathname;
}

function goToFriends() {
    NavigationRouter.transitionTo(FRIENDS_PATH);
}

function redirectAwayFromQuests() {
    if (isQuestPath(location.pathname)) goToFriends();
}

function guardHistoryWriter(method: "pushState" | "replaceState") {
    const original = history[method];
    originalHistoryWriters[method] = original;

    history[method] = function (this: History, data, unused, url) {
        original.call(this, data, unused, url);
        if (isQuestPath(pathnameOf(url))) setTimeout(redirectAwayFromQuests);
    };
}

function restoreHistoryWriters() {
    for (const [method, original] of Object.entries(originalHistoryWriters)) {
        history[method as "pushState" | "replaceState"] = original;
    }
}

export default definePlugin({
    name: "NoQuests",
    description:
        "Hides the Quests page and opens the friends list on startup instead",
    authors: [{ name: "anna_devminer", id: 602597585764483083n }],
    managedStyle,

    start() {
        guardHistoryWriter("pushState");
        guardHistoryWriter("replaceState");
        window.addEventListener("popstate", redirectAwayFromQuests);
    },

    stop() {
        restoreHistoryWriters();
        window.removeEventListener("popstate", redirectAwayFromQuests);
    },

    flux: {
        CONNECTION_OPEN() {
            if (hasRedirectedOnStartup) return;
            hasRedirectedOnStartup = true;
            goToFriends();
        },
    },
});
