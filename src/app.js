//IMPORTACIONES
import express from "express"
import { engine } from "express-handlebars"
import Viewrouter from "./Routes/view.router.js"
import { Server } from "socket.io"
import ProductsModel from "./dao/mongo/models/products.js"
import path from "path"
import { __dirname, authToken } from "./utils.js"
import mongoose from "mongoose"
import Productosrouter from "./Routes/productos.router.js"
import Carritorouter from "./Routes/carrito.router.js"
import Chatrouter from "./Routes/chat.router.js"
import MessagesModel from "./dao/mongo/models/messages.js"
import sessionRouter from "./Routes/session.router.js"
import session from "express-session"
import MongoStore from "connect-mongo"
import passport from "passport"
import intializePassport from "./config/passport.config.js"
import cookieParser from "cookie-parser"
import {configuration} from "./config.js"
//Configuración del dotenv
configuration()
//Inicializar express
const app = express()
//Guardar el puerto
const PORT = process.env.PORT
//Guardar la direccion de la base de Mongo
const MONGO_URL = process.env.URL_MONGOOSE
//Conectar con mongo
mongoose.connect(MONGO_URL)
//Modo de trabajo
const ENVIRONMENT = process.env.ENVIRONMENT

//Cookie
app.use(cookieParser("C0D3RS3CR3T"))

//Sesión con mongo
app.use(session({
    store : MongoStore.create({
        mongoUrl: process.env.URL_MONGOOSE,
        mongoOptions: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
        ttl: 100
    }),
    secret: "coderSecret",
    resave: false,
    saveUninitialized: false
}))

//Passport
intializePassport()
app.use(passport.initialize())
app.use(passport.session()) 

//Configuración del express
app.use(express.json())
app.use(express.urlencoded({extended : true}))

//Configuración del handlebars
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, "./views"));


//Uso de la carpeta public para ver el contenido / comunicación cliente servidor
app.use(express.static("../public"))

//Rutas
app.use("/productos",Productosrouter)
app.use("/carrito",Carritorouter)
app.use("/views",authToken,Viewrouter)
app.use("/chat",authToken,Chatrouter)
app.use("/",sessionRouter)



//Inicializar el servidor con socket
const server = app.listen(PORT,()=>{
    console.log("Escuchando desde el puerto " + PORT + " en modo " + ENVIRONMENT)
})

server.on("error",(err)=>{
    console.log(err)
})


const ioServer = new Server(server)

ioServer.on("connection", async (socket) => {
    console.log("Nueva conexión establecida");

    socket.on("disconnect",()=>{
        console.log("Usuario desconectado")
    })

    socket.on("new-product", async (data) => {
      console.log("Producto agregado correctamente",data)
    });

    socket.on("delete-product",async(data)=>{ 
        let id = data;
        let result = await ProductsModel.findByIdAndDelete(id);
        console.log("Producto eliminado", result);
    })
    

    const productos = await ProductsModel.find({}).lean()
    socket.emit("update-products", productos)

    socket.on("guardar-mensaje",(data)=>{
        MessagesModel.insertMany([data])
    })

    const mensajes = await MessagesModel.find({}).lean()
    socket.emit("enviar-mensajes",mensajes)
    socket.on("Nuevos-mensajes",(data)=>{
        console.log(data + " nuevos mensajes")
    })
});