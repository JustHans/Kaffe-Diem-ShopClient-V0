const {v4: uuidv4} = require('uuid')
const readline = require('readline')
const WebSocket = require('ws')

class Client{
    socket;
    responseHandlers = new Map()
    currentOrders = [];
    rl; //Readline: Console interface

    constructor(port){
        this.socket = new WebSocket("ws://localhost:" + port)

        this.socket.on('open', () => {
            console.log("Websocket connected successfully")
            this.socket.on('message', (message) => this.handleIncommingMessage(JSON.parse(message)))
            
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })

            this.CONSOLECONTROL()
        })
    }

    CONSOLECONTROL(){
        this.rl.question(" -> ", (answer) => {
            switch(answer){
                case "close":
                    console.log("\nClosing client . . .")
                    this.rl.close();
                    break;
                case "addorder":
                    this.rl.question("\nName: ", (name) => {
                        var orderName = name;
                        this.rl.question("Order: ", (order) => {
                            this.addNewOrder(order, orderName)

                            this.CONSOLECONTROL();
                        })
                    })
                    break;
                case "login":
                    this.rl.question("\nUsername: ", (username) => {
                        this.rl.question("Password: ", (password) => {
                            this.login(username,password);

                            this.CONSOLECONTROL();
                        })
                    })
                    break;
                case "completeorder":
                    this.rl.question("\nID: ", (id) => {
                        this.completeOrder(id);

                        this.CONSOLECONTROL();
                    })
                    break;
                case "updateorders":
                    this.updateOrders()

                    this.CONSOLECONTROL();
                case "removeorder":
                    this.rl.question("ID: ", (id) => {
                        this.removeOrder(id);

                        this.CONSOLECONTROL();
                    })
            }
        })
    }

    handleIncommingMessage(message){
        switch (message.type){
            case "RESPONSE":
                this.handleResponse(message.id, message.data)
                break;
            case "ERROR":
                console.log("ERROR: " + message.data.errorMessage)
                break;
            case "UPDATEORDERS":
                this.updateOrders();
                break;
        }
    }

    handleResponse(id, data){
        if(this.responseHandlers.has(id)){
            var handler = this.responseHandlers.get(id);
            handler && handler(data)
            this.responseHandlers.delete(id)
        }
    }

    //Login to server
    login(username, password){
        this.sendMessage(
            {
                type:"login",
                data:{
                    username:username,
                    password:password
                }
            }
        ).then((responseData) => {
            console.log(responseData.message)
        })
    }

    completeOrder(id){
        this.sendMessage(
            {
                type:"completeOrder",
                data:{
                    id:id
                }
            }
        ).then((responseData) => {
            console.log(responseData.message)
        })
    }

    //Remove an order by id
    removeOrder(id){
        this.sendMessage(
            {
                type:"removeOrder",
                data: {
                    id:id
                }
            }
        ).then((responseData) => {
            console.log(responseData.message)
        })
        
    }

    //Send a new order to the server and wait for the processed order to return
    addNewOrder(order, name){
        this.sendMessage(
            {
                type:"addNewOrder",
                data:{
                    order:order,
                    name:name
                }
            }
        ).then((responseData) => {
            console.log(responseData.order);
        })
    }

    //Update the local orders list by calling "getOrders" from server
    updateOrders(){
        this.sendMessage(
            {
                type:"getOrders",
                data:{}
            }
        ).then((responseData) => { 
            this.currentOrders = responseData.orders; 
        })
    }

    //Same as this.socket.send except it takes a JSON object (unstringified) as a parameter, and will return some Response in expected format
    sendMessage(message){
        return new Promise((resolve) => {
            var id = uuidv4();
            this.responseHandlers.set(id, resolve);
            message.id = id;
            this.socket.send(JSON.stringify(message));
        })
    }
}

var client = new Client(8080);