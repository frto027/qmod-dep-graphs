import { writeFileSync } from "fs"
import { Database } from "./database"
import { MNode, ModNode, NodeType, PackageNode } from "./mod_interface"
import { versions } from "./version_config"

abstract class Handler{
    db:Database
    constructor(db:Database){
        this.db = db
    }
    async handle(node:MNode){
        if(node.type == NodeType.Mod)
            return await this.handleMod(node as ModNode)
        if(node.type == NodeType.Package)
            return await this.handlePackage(node as PackageNode)
    }

    abstract handleMod(node:ModNode):Promise<void>
    abstract handlePackage(node:PackageNode):Promise<void>
}

class DepHandler extends Handler{
    async handleMod(node: ModNode){
        for(let dep of node.mod_deps){
            if(dep.qmod_url){
                let r = await this.db.get(dep.qmod_url)
                await this.handle(r)
            }
        }
    }
    async handlePackage(node: PackageNode){
        //don't care packages
    }
}

function getLatestMods(mods:any){
    let mod_versions:Map<string, any> = new Map()
    for(let mod of mods){
        let omod = mod_versions.get(mod.id)
        if(omod && omod.version > mod.version){
            continue
        }
        mod_versions.set(mod.id, mod)
    }
    let ret = []
    for(let mod of mod_versions.entries()){
        ret.push(mod[1])
    }
    return ret
}

interface Manifest{
    timestamp:number
    jsonnames:string[]
}

async function main() {
    let db = new Database("database/total.json")

    let modjson = await (await fetch("https://mods.bsquest.xyz/mods.json")).json()
    // console.log(modjson)

    let manifest:Manifest = {
        timestamp: +new Date(),
        jsonnames: [
            'total.json', //what what...?
        ]
    }

    for(let version of versions){
        let version_db = new Database(`database/${version}_latest_mods.json`, db, true)
        manifest.jsonnames.push('${version}_latest_mods.json')
        let depHandler = new DepHandler(version_db)
        async function handleMods(objs:any){
            for(let obj of objs){
                let url = obj.download
                if(url && url.endsWith(".qmod")){
                    await depHandler.handle(await version_db.get(url))
                }
            }
        }
        let mods = modjson[version]
        await handleMods(getLatestMods(mods))
        version_db.save()
        db.save()
    }
    writeFileSync('database/manifest.json', JSON.stringify(manifest))
}

main()