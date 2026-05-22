const socket = io();

const btn =
    document.getElementById("btn");

const me =
    document.getElementById("me");

const other =
    document.getElementById("other");

let localStream;

let peer;

let partnerId;

const servers = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        },

        {
            urls:
                "stun:global.stun.twilio.com:3478"
        },

        {
            urls:
                "turn:openrelay.metered.ca:80",
            username:
                "openrelayproject",
            credential:
                "openrelayproject"
        },

        {
            urls:
                "turn:openrelay.metered.ca:443",
            username:
                "openrelayproject",
            credential:
                "openrelayproject"
        },

        {
            urls:
                "turn:openrelay.metered.ca:443?transport=tcp",
            username:
                "openrelayproject",
            credential:
                "openrelayproject"
        }
    ]
};

btn.onclick = async () => {

    btn.style.display = "none";

    localStream =
        await navigator.mediaDevices
            .getUserMedia({

                video: true,
                audio: true
            });

    me.srcObject =
        localStream;

    console.log("CAMERA READY");

    socket.emit("ready");
};

socket.on("matched", async data => {

    console.log(
        "MATCHED"
    );

    partnerId =
        data.partner;

    createPeer();

    if (data.initiator) {

        console.log(
            "CREATING OFFER"
        );

        const offer =
            await peer.createOffer();

        await peer
            .setLocalDescription(
                offer
            );

        socket.emit("signal", {

            to: partnerId,

            signal: offer
        });
    }
});

socket.on("signal", async data => {

    console.log(
        "SIGNAL:",
        data.signal
    );

    if (
        data.signal.type ===
        "offer"
    ) {

        console.log(
            "RECEIVED OFFER"
        );

        if (!peer) {

            createPeer();
        }

        await peer
            .setRemoteDescription(
                new RTCSessionDescription(
                    data.signal
                )
            );

        const answer =
            await peer
                .createAnswer();

        await peer
            .setLocalDescription(
                answer
            );

        socket.emit("signal", {

            to: data.from,

            signal: answer
        });
    }

    else if (
        data.signal.type ===
        "answer"
    ) {

        console.log(
            "RECEIVED ANSWER"
        );

        await peer
            .setRemoteDescription(
                new RTCSessionDescription(
                    data.signal
                )
            );
    }

    else if (
        data.signal.candidate
    ) {

        console.log(
            "RECEIVED ICE"
        );

        try {

            await peer
                .addIceCandidate(
                    new RTCIceCandidate(
                        data.signal
                    )
                );

        } catch (err) {

            console.log(err);
        }
    }
});

function createPeer() {

    console.log(
        "CREATING PEER"
    );

    peer =
        new RTCPeerConnection(
            servers
        );

    localStream.getTracks()
        .forEach(track => {

            peer.addTrack(
                track,
                localStream
            );
        });

    peer.ontrack = async e => {

        console.log(
            "REMOTE STREAM RECEIVED"
        );

        other.srcObject =
            e.streams[0];

        try {

            await other.play();

        } catch (err) {

            console.log(err);
        }
    };

    peer.onicecandidate =
        e => {

            if (e.candidate) {

                console.log(
                    "SENDING ICE"
                );

                socket.emit(
                    "signal",
                    {

                        to: partnerId,

                        signal:
                            e.candidate
                    }
                );
            }
        };

    peer.onconnectionstatechange =
        () => {

            console.log(
                "STATE:",
                peer.connectionState
            );
        };
}
