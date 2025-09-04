"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function zline(x) {
    return (x % 2) - 1;
}
var echarts;
async function load() {
    let json = await (await fetch("database/latest_db.json")).json();
    var chartDom = document.getElementById("main");
    var myChart = echarts.init(chartDom, null, { renderer: 'svg' });
    let data = [];
    let links = [];
    let mod_user_info = new Map();
    let mod_dep_info = new Map();
    /***** mod version compat merge ******/
    let modLatestVersion = new Map();
    let depratchedMods = new Set();
    for (let mod of json) {
        let old = modLatestVersion.get(mod.item.id);
        if (old == undefined || old < mod.item.version) {
            // if(old != undefined){
            //     depratchedMods.add(mod.item.id + ":" + old)
            // }
            modLatestVersion.set(mod.item.id, mod.item.version);
        }
        //more offensive, remove every mod if it's not used by others or use others
        depratchedMods.add(mod.item.id + ":" + mod.item.version);
    }
    function getDepVersion(id, versionRange, version) {
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
        if (item.type == 0) {
            //qmod
            let qmod_item = item;
            data.push({
                name: echart_name,
                _author: qmod_item.author,
                // x:Math.random() * 2,y:Math.random() * 2,
                value: item.name + "\n(" + item.version + ")" + " by " + qmod_item.author,
                symbol: 'rect',
                symbolSize: [150, 30],
                // category: "qmod"
            });
            x_incr += 30;
            qmod_item.mod_deps.forEach(dep => {
                let other_echart_name = "0:" + dep.id + ":" + getDepVersion(dep.id, dep.versionRange, dep.version);
                let edge_text = item.name + ">" + dep.id + ":" + dep.versionRange;
                links.push({
                    source: other_echart_name,
                    target: echart_name,
                    _versionRange: edge_text
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
            });
            pkg_item.pkg_deps.forEach(dep => {
                let other_echart_name = "1:" + dep.id + ":" + getDepVersion(dep.id, dep.versionRange, dep.version);
                let edge_text = item.name + ">" + dep.id + ":" + dep.versionRange;
                links.push({
                    source: other_echart_name,
                    target: echart_name,
                    _versionRange: edge_text
                    // symbol: [undefined, 'arrow']
                });
                mod_user_info.set(other_echart_name, (mod_user_info.get(other_echart_name) ?? "") + edge_text + "<br>");
                mod_dep_info.set(echart_name, (mod_dep_info.get(echart_name) ?? "") + edge_text + "<br>");
            });
        }
    }
    /**** remove depratched mods if nobody use it ****/
    {
        for (let link of links) {
            depratchedMods.delete(link.source.substring(2));
            depratchedMods.delete(link.target.substring(2));
        }
        let copy_data = data;
        copy_data = [];
        for (let dat of data) {
            if (depratchedMods.has(dat.name.substring(2)))
                continue;
            copy_data.push(dat);
        }
        data = copy_data;
        console.log(depratchedMods);
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
            dat.x = depth_percentage * 2000;
            dat.y = (depth + 2) * 200 + zline((depth_distance[depth] ?? 0) / 4) * 200;
            // }else{
            //     let depth_percentage = (depth_distance[depth] ?? 0) / (depth_count[depth] ?? 1)
            //     let hori_depth:number = depth_distance[depth] ?? 0
            //     dat.x = depth_percentage * 3
            //     dat.y = (depth + 2) * 20
            // }
        }
    }
    /**** done ****/
    var option = {
        tooltip: {},
        // dataZoom:{
        //     type:'inside'
        // },
        // legend: [
        //     {
        //         // data: ["qmod","package"]
        //     }
        // ],
        series: [
            {
                name: 'qmod relationships',
                type: 'graph',
                data: data,
                links: links,
                // zoom:0.4,
                // coordinateSystem:'cartesian2d',
                coordinateSysmteUsage: 'box',
                layout: "none",
                // force: {
                //     // initLayout:"circular",
                //     // repulsion: 1,
                //     edgeLength: 10
                // },
                draggable: true,
                // roam: true,
                label: {
                    show: true,
                    color: 'black',
                    // backgroundColor:'gray',
                    formatter: function (v) {
                        return v.data.value;
                    }
                },
                // labelLayout: {
                // hideOverlap: true
                // },
                // scaleLimit: {
                // min: 0.4,
                // max: 2
                // },
                lineStyle: {
                    width: 2,
                    color: 'source',
                    curveness: 0.3
                },
                itemStyle: {
                    color: 'gray'
                },
                edgeSymbol: ['circle', 'arrow'],
                tooltip: {
                    formatter: function (params, ticket, callback) {
                        let name = params?.data?.name;
                        if (name) {
                            let users = mod_user_info.get(name);
                            let deps = mod_dep_info.get(name);
                            let ret = "";
                            if (params?.data?._author) {
                                ret = "By " + params?.data?._author;
                            }
                            if (users) {
                                if (ret != "")
                                    ret += "<hr>";
                                ret += "used by:<br>" + users;
                            }
                            if (deps) {
                                if (ret != "")
                                    ret += "<hr>";
                                ret += "depends on:<br>" + deps;
                            }
                            if (ret != "")
                                return ret;
                        }
                        return params?.data?._versionRange ?? "";
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