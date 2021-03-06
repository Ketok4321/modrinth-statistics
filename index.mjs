import fetch from "node-fetch";
import colors from "colors/safe.js";

const apiBase = "https://api.modrinth.com";

let requests = 0;
let start, end;

async function fetchJson(url) {
    requests++;
    return await (await fetch(url)).json();
}

async function count(facets) {
    const url = new URL(apiBase + "/v2/search");
    url.search = new URLSearchParams({
        limit: 0,
        facets: JSON.stringify(facets)
    });

    const res = await fetchJson(url);

    return res.total_hits;
}

async function countStats(facetsMap, sort = true) {
    const statsPromises = [];

    for (const [name, facets] of facetsMap) {
        statsPromises.push(new Promise(async (resolve) => resolve([name, await count(facets)])));
    }

    const stats = await Promise.all(statsPromises);

    return sort ? stats.sort((a, b) => b[1] - a[1]) : stats;
}

function simpleStat(name, value) {
    console.log(colors.blue.bold(name) + colors.gray(": ") + colors.cyan(value));
    
    console.log();
}

function tableStat(name, stats) {
    console.log(colors.blue.bold(`${name}:`));
    for (const stat of stats) {
        console.log(colors.green(stat[0]) + colors.gray(": ") + colors.cyan(`${Math.round(stat[1] / totalMods * 100)}% `) + colors.dim(`(${stat[1]})`));
    }

    console.log();
}

async function gatherLoaderStats() {
    const loaders = (await fetchJson(apiBase + "/v2/tag/loader"))
        .map(loader => loader.name);

    const facets = loaders.map(loader => [loader, [
        ["project_type:mod"],
        [`categories:${loader}`]
    ]]);

    return await countStats(facets);
}

async function gatherVersionStats() {
    const versions = (await fetchJson(apiBase + "/v2/tag/game_version"))
        .filter(version => version.version_type == "release")
        .map(version => version.version)
        .slice(0, 10);

    const facets = versions.map(version => [version, [
        ["project_type:mod"],
        [`versions:${version}`]
    ]]);

    return await countStats(facets, false);
}

async function gatherLicenseStats() {
    const licenses = (await fetchJson(apiBase + "/v2/tag/license"))
        .map(license => license.short);

    const facets = licenses.map(license => [license, [
        ["project_type:mod"],
        [`license:${license}`]
    ]]);

    return await countStats(facets);
}

start = new Date();
const [totalMods, loaderStats, versionStats, licenseStats] = await Promise.all([count([["project_type:mod"]]), gatherLoaderStats(), gatherVersionStats(), gatherLicenseStats()]);
end = new Date();

simpleStat("Total mods", totalMods);
tableStat("Modloaders", loaderStats);
tableStat("Versions", versionStats);
tableStat("Licenses", licenseStats);

console.log(colors.gray(`Gathering statistics took ${(end - start) / 1000}s (${requests} requests)`));