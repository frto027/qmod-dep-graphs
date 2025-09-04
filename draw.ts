import { DBItem } from "./database";
import { ModNode, PackageNode } from "./mod_interface";

function zline(x:number){
    return (x % 2) - 1
}

var echarts: any
async function load() {
    let json: Array<DBItem> = await (await fetch("database/latest_db.json")).json() as Array<DBItem>

    var chartDom = document.getElementById("main")
    var myChart = echarts.init(chartDom, null, {renderer: 'svg' })

    let data: Array<{
        name: string, x?: number, y?: number, value?: string, category?: string,
        symbol?: string,
        symbolSize?: any
    }> = []
    let links: Array<{
        source: string,
        target: string,
        symbol?: any,
        symbolSize?: any
    }> = []

    /***** feed the data *******/
    let x_incr = 20
    for (let node of json) {
        let item = node.item
        let echart_name = item.type + ":" + item.id + ":" + item.version


        if (item.type == 0) {
            //qmod
            let qmod_item = item as ModNode
            data.push({
                name: echart_name,
                // x:Math.random() * 2,y:Math.random() * 2,
                value: item.name + "\n(" + item.version + ")",
                symbol: 'rect',
                symbolSize: [150, 30],
                // category: "qmod"
            })
            x_incr += 30

            qmod_item.mod_deps.forEach(dep => {
                let other_echart_name = "0:" + dep.id + ":" + dep.version
                links.push({
                    source: other_echart_name,
                    target: echart_name,
                    // symbol: [undefined, 'arrow']
                })
            })
        } else {
            let pkg_item = item as PackageNode
            data.push({
                name: echart_name,
                value: item.name + "\n(" + item.version + ")",
            })
            pkg_item.pkg_deps.forEach(dep => {
                let other_echart_name = "1:" + dep.id + ":" + dep.version
                links.push({
                    source: other_echart_name,
                    target: echart_name,
                    // symbol: [undefined, 'arrow']
                })

            })
        }
    }

    /***** update data position with depth ******/
    {
        let dataMaps:Map<string, any> = new Map()
        for(let dat of data){
            dataMaps.set(dat.name,dat)
        }

        let linkMaps:Map<string,Set<string> > = new Map()
        for(let link of links){
            if(!linkMaps.has(link.source))
                linkMaps.set(link.source, new Set())
            linkMaps.get(link.source)?.add(link.target)
        }

        function update_depth(data:any){
            if(data.touched)
                return
            data.touched = true
            let targets = linkMaps.get(data.name)
            let depth = 0
            if(!targets){
                data.depth = -1
                return
            }
            for(let target of targets){
                update_depth(dataMaps.get(target))
                depth = Math.max(dataMaps.get(target)?._depth ?? 0, depth)
            }
            data._depth = depth + 1
        }

        for(let dat of data){
            update_depth(dat)
        }

        let depth_distance:Array<number> = []
        let depth_count:Array<number> = []
        for(let dat of data){
            let depth = (dat as any)._depth
            if(depth == undefined)
                depth = -1
            depth_count[depth] = (depth_count[depth] ?? 0) + 1
        }
        for(let dat of data){
            let depth = (dat as any)._depth
            if(depth == undefined)
                depth = -1
            depth_distance[depth] = (depth_distance[depth] ?? 0) + 1

            // if(depth_count[depth] ?? 1 > 10){
                let depth_percentage = ((depth_distance[depth] ?? 0) - 0.5) / (depth_count[depth] ?? 1)
                let hori_depth:number = depth_distance[depth] ?? 0
                dat.x = depth_percentage * 2000
                dat.y = (depth + 2) * 200 + zline((depth_distance[depth] ?? 0)/4) * 200
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
                coordinateSysmteUsage:'box',
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
                    formatter: function (v: any) {
                        return v.data.value
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
                    width:2,
                color: 'source',
                curveness: 0.3
                },
                itemStyle:{
                    color:'gray'
                },
                edgeSymbol:['circle','arrow']
            }
        ]
    };
    console.log(option)
    myChart.setOption(option);
}
load()