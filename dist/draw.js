"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function zline(x) {
    return (x % 2) - 1;
}
function makeData(json, config) {
    let data = [];
    let links = [];
    let data_ids = new Set();
    let mod_user_info = new Map();
    let mod_dep_info = new Map();
    const need_filter_versions = config.filterVersions ?? true;
    /***** mod version compat merge ******/
    let modLatestVersion = new Map();
    let depratchedMods = new Set();
    for (let mod of json) {
        let old = modLatestVersion.get(mod.item.id);
        if (old == undefined || old < mod.item.version) {
            modLatestVersion.set(mod.item.id, mod.item.version);
        }
    }
    if (need_filter_versions) {
        for (let mod of json) {
            let latest = modLatestVersion.get(mod.item.id);
            if (latest) {
                if (mod.item.version != latest) {
                    depratchedMods.add(mod.item.id + ":" + mod.item.version);
                }
            }
        }
    }
    function getDepVersion(id, versionRange, version) {
        if (!need_filter_versions)
            return version;
        let latest = modLatestVersion.get(id);
        if (latest == undefined)
            return version;
        if (versionRange[0] == '^')
            return latest;
        return version;
    }
    /***** feed the data *******/
    let x_incr = 20;
    for (let node of json) {
        let item = node.item;
        let echart_name = item.type + ":" + item.id + ":" + item.version;
        if (data_ids.has(echart_name))
            continue;
        else
            data_ids.add(echart_name);
        if (item.type == 0) {
            //qmod
            let qmod_item = item;
            data.push({
                name: echart_name,
                _author: qmod_item.author,
                // x:Math.random() * 2,y:Math.random() * 2,
                category: qmod_item.author,
                value: item.name +
                    (config.showVersionInIcon ? "(" + item.version + ")" : "") +
                    (config.showAuthorInIcon ? "\nby " + qmod_item.author : ""),
                // category: "qmod"
                _hint: ""
            });
            x_incr += 30;
            qmod_item.mod_deps.forEach(dep => {
                let other_echart_name = "0:" + dep.id + ":" + getDepVersion(dep.id, dep.versionRange, dep.version);
                let edge_text = item.name + ">" + dep.id + ":" + dep.versionRange;
                links.push({
                    source: other_echart_name,
                    target: echart_name,
                    _hint: edge_text
                    // symbol: [undefined, 'arrow']
                });
                mod_user_info.set(other_echart_name, (mod_user_info.get(other_echart_name) ?? "") + edge_text + "<br>");
                mod_dep_info.set(echart_name, (mod_dep_info.get(echart_name) ?? "") + edge_text + "<br>");
            });
        }
        else {
            let pkg_item = item;
            data.push({
                name: echart_name,
                value: item.name + "\n(" + item.version + ")",
                _hint: ""
            });
            pkg_item.pkg_deps.forEach(dep => {
                let other_echart_name = "1:" + dep.id + ":" + getDepVersion(dep.id, dep.versionRange, dep.version);
                let edge_text = item.name + ">" + dep.id + ":" + dep.versionRange;
                links.push({
                    source: other_echart_name,
                    target: echart_name,
                    _hint: edge_text
                    // symbol: [undefined, 'arrow']
                });
                mod_user_info.set(other_echart_name, (mod_user_info.get(other_echart_name) ?? "") + edge_text + "<br>");
                mod_dep_info.set(echart_name, (mod_dep_info.get(echart_name) ?? "") + edge_text + "<br>");
            });
        }
    }
    /**** remove depratched mods if nobody use it ****/
    while (need_filter_versions) {
        let changed = false;
        for (let link of links) {
            depratchedMods.delete(link.source.substring(2));
            // depratchedMods.delete(link.target.substring(2))            
        }
        let copy_data = data;
        copy_data = [];
        for (let dat of data) {
            if (depratchedMods.has(dat.name.substring(2)))
                continue;
            copy_data.push(dat);
        }
        changed ||= data.length != copy_data.length;
        data = copy_data;
        let copy_links = links;
        copy_links = [];
        for (let link of links) {
            if (depratchedMods.has(link.source.substring(2)))
                continue;
            if (depratchedMods.has(link.target.substring(2)))
                continue;
            copy_links.push(link);
        }
        changed ||= links.length != copy_links.length;
        links = copy_links;
        if (!changed)
            break;
    }
    /***** update data position with depth ******/
    {
        let dataMaps = new Map();
        for (let dat of data) {
            dataMaps.set(dat.name, dat);
        }
        let linkMaps = new Map();
        for (let link of links) {
            if (!linkMaps.has(link.source))
                linkMaps.set(link.source, new Set());
            linkMaps.get(link.source)?.add(link.target);
        }
        function update_depth(data) {
            if (data.touched)
                return;
            data.touched = true;
            let targets = linkMaps.get(data.name);
            let depth = 0;
            if (!targets) {
                data.depth = -1;
                return;
            }
            for (let target of targets) {
                update_depth(dataMaps.get(target));
                depth = Math.max(dataMaps.get(target)?._depth ?? 0, depth);
            }
            data._depth = depth + 1;
        }
        for (let dat of data) {
            update_depth(dat);
        }
        let depth_distance = [];
        let depth_count = [];
        for (let dat of data) {
            let depth = dat._depth;
            if (depth == undefined)
                depth = -1;
            depth_count[depth] = (depth_count[depth] ?? 0) + 1;
        }
        for (let dat of data) {
            let depth = dat._depth;
            if (depth == undefined)
                depth = -1;
            depth_distance[depth] = (depth_distance[depth] ?? 0) + 1;
            // if(depth_count[depth] ?? 1 > 10){
            let depth_percentage = ((depth_distance[depth] ?? 0) - 0.5) / (depth_count[depth] ?? 1);
            let hori_depth = depth_distance[depth] ?? 0;
            dat.x = depth_percentage * 3000;
            dat.y = (depth + 2) * 300 + zline((depth_distance[depth] ?? 0) / 4) * 260;
            // }else{
            //     let depth_percentage = (depth_distance[depth] ?? 0) / (depth_count[depth] ?? 1)
            //     let hori_depth:number = depth_distance[depth] ?? 0
            //     dat.x = depth_percentage * 3
            //     dat.y = (depth + 2) * 20
            // }
        }
    }
    /********** add hint text to nodes *********/
    {
        for (let dat of data) {
            let name = dat.name;
            let users = mod_user_info.get(name);
            let deps = mod_dep_info.get(name);
            let ret = "";
            if (dat._author) {
                ret = "By " + dat._author;
            }
            if (users && (config.showUsedBy ?? false)) {
                if (ret != "")
                    ret += "<hr>";
                ret += "used by:<br>" + users;
            }
            if (deps && (config.showDeps ?? false)) {
                if (ret != "")
                    ret += "<hr>";
                ret += "depends on:<br>" + deps;
            }
            if (ret != "")
                dat._hint = ret;
        }
    }
    let category = [];
    {
        let authors = new Set();
        for (let dat of data) {
            authors.add(dat._author ?? "");
            // dat.category = dat._author ?? ""
        }
        authors.delete("");
        for (let auth of authors)
            category.push({
                name: auth
            });
    }
    return { data, links, category };
}
var echarts;
var chartDom = document.getElementById("main");
var myChart = echarts.init(chartDom, null, { renderer: 'svg' });
{
    let cbs = document.getElementsByClassName("chart-conf");
    for (let i = 0; i < cbs.length; i++) {
        cbs[i].onchange = () => load();
    }
}
{
    document.getElementById("data-collection").onchange = () => load();
}
async function load() {
    let json_url = document.getElementById("data-collection").value ?? "database/1.37.0_9064817954_latest_mods.json";
    if (json_url == "") {
        myChart.clear();
        return;
    }
    let json = await (await fetch(json_url)).json();
    let config = {};
    let cbs = document.getElementsByClassName("chart-conf");
    for (let i = 0; i < cbs.length; i++) {
        config[cbs[i]?.id ?? ""] = cbs[i].checked;
    }
    const { data, links, category } = makeData(json, config);
    /**** done ****/
    var option = {
        tooltip: {},
        legend: [
            {
                data: category.map(d => d.name),
                selector: true
            },
        ],
        series: [
            {
                name: 'qmod relationships',
                type: 'graph',
                data: data,
                links: links,
                draggable: true,
                categories: category,
                label: {
                    show: true,
                    color: 'black',
                    fontSize: 8,
                    formatter: function (v) {
                        return v.data.value;
                    }
                },
                scaleLimit: {
                    min: 0.4,
                    max: 2
                },
                emphasis: {
                    focus: 'adjacency',
                },
                lineStyle: {
                    width: 2,
                    color: 'source',
                    curveness: 0.3
                },
                symbol: 'rect',
                symbolSize: [150, 20],
                edgeSymbol: ['circle', 'arrow'],
                tooltip: {
                    formatter: function (params, ticket, callback) {
                        return params?.data?._hint ?? "";
                    }
                }
            }
        ]
    };
    console.log(option);
    myChart.setOption(option);
}
load();
//# sourceMappingURL=draw.js.map