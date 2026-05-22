const express = require("express");

const app = express();

const http = require("http").createServer(app);

const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {};

io.on("connection", socket => {

    console.log(
        "CONNECTED:",
        socket.id
    );

    socket.on("join-room", roomId => {

        socket.join(roomId);

        socket.roomId = roomId;

        if (!rooms[roomId]) {

            rooms[roomId] = [];
        }

        rooms[roomId].push(socket.id);

        const otherUsers =
            rooms[roomId].filter(
                id => id !== socket.id
            );

        socket.emit(
            "all-users",
            otherUsers
        );

        socket.to(roomId).emit(
            "user-joined",
            socket.id
        );
    });

    socket.on("signal", data => {

        io.to(data.to).emit(
            "signal",
            {
                from: socket.id,
                signal: data.signal
            }
        );
    });

    socket.on("disconnect", () => {

        console.log(
            "DISCONNECTED:",
            socket.id
        );

        const roomId =
            socket.roomId;

        if (
            roomId &&
            rooms[roomId]
        ) {

            rooms[roomId] =
                rooms[roomId].filter(
                    id =>
                        id !== socket.id
                );

            socket.to(roomId).emit(
                "user-left",
                socket.id
            );

            if (
                rooms[roomId]
                    .length === 0
            ) {

                delete rooms[roomId];
            }
        }
    });
});

const PORT =
    process.env.PORT || 3000;

http.listen(PORT, () => {

    console.log(
        "RUNNING ON",
        PORT
    );
});
