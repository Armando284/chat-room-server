const PORT = process.env.PORT || 3000
let usersConnected = 0;
const express = require('express')
const app = express()
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'))

const http = app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})

app.get('/', (req, res) => {
    res.render("index")
    // res.set("Content-Security-Policy", "default-src 'self'; style-src-elem 'self' https://cdn.jsdelivr.net").render("index")
    // res.send('Anonymous chat room working')
})

// https://admin.socket.io
const { instrument } = require('@socket.io/admin-ui')
const bcrypt = require('bcrypt')

const io = require('socket.io')(http, {
    cors: {
        origin: [
            "http://127.0.0.1:5500",
            "http://localhost:8080",
            "http://192.168.32.12:8080",
            "https://admin.socket.io",
            "https://chat-room-web-application.vercel.app"
        ]
    }
})

io.on('connection', (socket) => {
    console.log('a user connected', socket.id)
    setTimeout(() => {
        socket.broadcast.emit('update-connections', { connected: ++usersConnected })
        socket.emit('update-connections', {
            connected: usersConnected
        })
        console.log("other user connected", usersConnected)
    }, 1000);
    socket.on('disconnect', function () {
        --usersConnected
        if (usersConnected < 0) usersConnected = 0
        socket.broadcast.emit('update-connections', { connected: usersConnected })
        console.log("a user disconnected", usersConnected)
    })
    socket.on('message', (message, room, callback) => {
        const userId = socket.id.substr(0, 4)
        if (!room || room === '' || room === 'Public') {
            socket.broadcast.emit('message', {
                id: userId,
                messageId: message.messageId,
                message: `<strong><i>${userId} dijo:</i></strong> ${message.message}`,
                room: 'Public'
            })
        } else {
            socket.to(room).emit('message', {
                id: userId,
                messageId: message.messageId,
                message: `<strong><i>${userId} dijo:</i></strong> ${message.message}`,
                room: room
            })
        }
        callback('sended')
        // setTimeout(() => {
        //     callback('sended')
        // }, 3000);
    })

    socket.on('join-room', (room, callback) => {
        socket.join(room)
        callback(`Bienvenido a la sala: ${room}`)
    })
})

const password = bcrypt.hashSync(process.env.ADMIN_PASSWORD || '', 10)

instrument(io, { auth: { type: 'basic', username: process.env.ADMIN_USER, password: password } })