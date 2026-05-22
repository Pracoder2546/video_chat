const express = require("express");

const app = express();

const http = require("http").createServer(app);

const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", socket => {

    console.log("CONNECTED:", socket.id);

    socket.on("ready", () => {

        console.log(
            "READY:",
            socket.id
        );

        if (waitingUser) {

            const partner =
                waitingUser;

            waitingUser = null;

            socket.partner =
                partner.id;

            partner.partner =
                socket.id;

            console.log(
                "MATCHING USERS"
            );

            // SEND TO BOTH
            io.to(socket.id).emit(
                "matched",
                {
                    partner:
                        partner.id,

                    initiator: true
                }
            );

            io.to(partner.id).emit(
                "matched",
                {
                    partner:
                        socket.id,

                    initiator: false
                }
            );

        } else {

            waitingUser = socket;

            console.log(
                "WAITING FOR PARTNER"
            );
        }
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

        if (
            waitingUser &&
            waitingUser.id === socket.id
        ) {

            waitingUser = null;
        }
    });
});

http.listen(3000, () => {

    console.log(
        "RUNNING ON 3000"
    );
});