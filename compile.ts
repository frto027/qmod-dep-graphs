import { existsSync, readFileSync, writeFileSync } from "fs"
import { Database } from "./database"
import { MNode, ModNode, NodeType, PackageNode } from "./mod_interface"
import { pc_versions, versions } from "./version_config"
import { assignBeatModsToDatabase } from "./pc_handler"

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
    let quest_jsons = await (await fetch("https://mods.bsquest.xyz/mods.json")).json()
    // console.log(quest_jsons)

    let manifest:Manifest = {
        timestamp: +new Date(),
        jsonnames: [
        ]
    }

    let anything_changed = false

    for(let version of versions){
        let old_things = ""
        
        let json_filename = `${version}_latest_mods.json`
        let json_path = "database/" + json_filename

        if(existsSync(json_path)){
            old_things = readFileSync(json_path).toString("utf-8")
        }

        let version_db = new Database(json_path, false)
        manifest.jsonnames.push(json_filename)
        let depHandler = new DepHandler(version_db)
        async function handleMods(objs:any){
            for(let obj of objs){
                let url = obj.download
                if(url && url.endsWith(".qmod")){
                    await depHandler.handle(await version_db.get(url))
                }
            }
        }
        let mods = quest_jsons[version]
        await handleMods(getLatestMods(mods))
        version_db.save()

        if(readFileSync(json_path).toString("utf-8") != old_things){
            anything_changed = true
        }
    }

    for(let version of pc_versions){
        let mod_json = await (await fetch(`https://beatmods.com/api/mods?gameName=BeatSaber&gameVersion=${version}&status=verified&=universalpc`)).json()
        let json_filename = `pc_${version}.json`
        let json_path = 'database/'+json_filename
        manifest.jsonnames.push(json_filename)

        let pc_old_things
        if(existsSync(json_path)){
            pc_old_things = readFileSync(json_path).toString("utf-8")
        }

        let version_db = new Database(json_path, false)

        assignBeatModsToDatabase(version_db, mod_json)
        version_db.save()

        if(readFileSync(json_path).toString("utf-8") != pc_old_things){
            anything_changed = true
        }
    } 

    if(anything_changed)
        writeFileSync('database/manifest.json', JSON.stringify(manifest))
}

main()