import { Database } from "./database"
import { MNode, ModNode, NodeType, PackageNode } from "./mod_interface"

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

async function main() {
    let db = new Database("database/db.json")
    let latest_db = new Database("database/latest_db.json", db)

    let modjson = await (await fetch("https://mods.bsquest.xyz/mods.json")).json()
    // console.log(modjson)

    let depHandler = new DepHandler(latest_db)

    async function handleMods(objs:any){
        for(let obj of objs){
            let url = obj.download
            if(url && url.endsWith(".qmod")){
                await depHandler.handle(await latest_db.get(url))
            }
        }
    }

    let mods = modjson["1.40.8_7379"]
    await handleMods(getLatestMods(mods))

    // let r = await db.get("https://github.com/frto027/HeartBeatLanClientBSQuest/releases/download/v0.3.5/HeartBeatQuest.1_40_8.qmod")


    // await depHandler.handle(r)



    db.save()
    latest_db.save()
}

main()