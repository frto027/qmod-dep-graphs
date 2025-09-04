import AdmZip = require("adm-zip")
import fs = require("fs")
import { MNode, ModNode, NodeType, PackageNode } from "./mod_interface"
export interface DBItem {
    url: string,
    item: MNode
}

function purgeVersion(version: string) {
    if (version[0] == '=' || version[0] == '<' || version[0] == '>' || version[0] == '^')
        return version.substring(1)
    return version
}

export class Database {
    path: string
    items: Array<DBItem>

    mirror?: Database
    constructor(path: string, mirror: Database | undefined = undefined) {
        this.path = path
        this.items = []
        if (fs.existsSync(path)) {
            this.items = JSON.parse(fs.readFileSync(path).toString("utf8"))
        }

        if (mirror)
            this.mirror = mirror
    }



    async get(url: string) {
        for (const item of this.items) {
            if (item.url == url)
                return item.item
        }
        let item = await this.download(url)

        this.items.push(item)
        return item.item
    }

    async get_package(id: string, version: string) {
        let url = "https://qpackages.com/" + id + "/" + version
        return await this.get(url)
    }

    async download(url: string): Promise<DBItem> {
        if (this.mirror) {
            return await this.mirror.download(url)
        }
        console.log("downloading...", url)
        let result = await fetch(url)
        let ret_item: MNode
        if (url.endsWith(".qmod")) {
            let s = new AdmZip(Buffer.from(await result.arrayBuffer()))
            let mod_json = s.readAsText("mod.json")
            let js = JSON.parse(mod_json)

            let item: ModNode = {
                type: NodeType.Mod,
                id: js.id,
                name: js.name,
                version: js.version,
                packageVersion: js.packageVersion,
                author: js.author,
                mod_deps: []
            }
            if (js.dependencies) {
                for (let dep of js.dependencies) {
                    item.mod_deps.push({
                        versionRange: dep.version,
                        version: purgeVersion(dep.version),
                        id: dep.id,
                        qmod_url: dep.downloadIfMissing
                    })
                }
            }

            ret_item = item

        } else {
            let r: any = await result.json()
            let item: PackageNode = {
                type: NodeType.Package,
                id: r.config.info.id as string,
                version: r.config.info.version as string,
                name: r.config.info.name as string,
                pkg_deps: []
            }

            r.config?.restoredDependencies?.forEach((element: any) => {
                item.pkg_deps.push({
                    versionRange: element.dependency.versionRange,
                    version: purgeVersion(element.dependency.versionRange),
                    id: element.dependency.id,
                })
            });

            ret_item = item
        }
        return {
            url: url,
            item: ret_item
        }
    }

    save() {
        fs.writeFileSync(this.path, JSON.stringify(this.items))
    }
}