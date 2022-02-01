import {httpRequest} from "@0k.io/node-request"

type configType = { [key: string]: string }


class Config {
    _config: configType | null = null
    path: string
    constructor(path: string) {
        this.path = path
    }

    async getLokapiDb(){
        if (!this._config) 
            this._config = await this.fetchConfig()
        return (this._config as configType ).lokapiDb
    }
    async getLokapiHost(){
        if (!this._config) 
            this._config = await this.fetchConfig()
        return (this._config as configType ).locapiHost
    }
    async getMapUrl(){
        if (!this._config) 
            this._config = await this.fetchConfig()
        return (this._config as configType ).mapUrl
    }

    async fetchConfig() {
        let response
        try {
            response = await httpRequest({ 
                protocol: window.location.protocol.split(":")[0],
                host:  window.location.host.split(":")[0],
                path:  window.location.pathname + this.path,
                method: "GET",
                port:8080
            })
            
        } catch(error) {
            console.log("Unable to load config file.")
            throw error
        }
        if (typeof(response) !== "string") {
            throw new Error("Unexpected response while loading config file.")
        }
        return JSON.parse(response)
    }
}


export default new Config("config.json")