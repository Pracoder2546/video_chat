const socket = io();

const roomInput =
    document.getElementById(
        "roomInput"
    );

const joinBtn =
    document.getElementById(
        "joinBtn"
    );

const videos =
    document.getElementById(
        "videos"
    );

const peers = {};

let localStream;

const servers = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
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
        }
    ]
};

joinBtn.onclick =
    async () => {

        const roomId =
            roomInput.value.trim();

        if (!roomId) {

            alert(
                "Enter room name"
            );

            return;
        }

        localStream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    video: true,
                    audio: true
                });

        addMyVideo();

        socket.emit(
            "join-room",
            roomId
        );
    };

socket.on(
    "all-users",
    async users => {

        for (const userId of users) {

            createPeer(
                userId,
                true
            );
        }
    }
);

socket.on(
    "user-joined",
    userId => {

        createPeer(
            userId,
            false
        );
    }
);

socket.on(
    "signal",
    async data => {

        const peer =
            peers[data.from];

        if (
            data.signal.type ===
            "offer"
        ) {

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

            socket.emit(
                "signal",
                {

                    to: data.from,

                    signal:
                        answer
                }
            );
        }

        else if (
            data.signal.type ===
            "answer"
        ) {

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
    }
);

socket.on(
    "user-left",
    userId => {

        if (peers[userId]) {

            peers[userId]
                .close();

            delete peers[userId];
        }
    }
);

function createPeer(
    userId,
    initiator
) {

    const peer =
        new RTCPeerConnection(
            servers
        );

    peers[userId] = peer;

    localStream
        .getTracks()
        .forEach(track => {

            peer.addTrack(
                track,
                localStream
            );
        });

    peer.ontrack =
        event => {

            addVideo(
                event.streams[0],
                userId
            );
        };

    peer.onicecandidate =
        event => {

            if (event.candidate) {

                socket.emit(
                    "signal",
                    {

                        to: userId,

                        signal:
                            event
                                .candidate
                    }
                );
            }
        };

    if (initiator) {

        createOffer(
            peer,
            userId
        );
    }
}

async function createOffer(
    peer,
    userId
) {

    const offer =
        await peer
            .createOffer();

    await peer
        .setLocalDescription(
            offer
        );

    socket.emit(
        "signal",
        {

            to: userId,

            signal: offer
        }
    );
}

function addMyVideo() {

    const video =
        document.createElement(
            "video"
        );

    video.srcObject =
        localStream;

    video.autoplay = true;

    video.muted = true;

    video.playsInline = true;

    videos.appendChild(video);
}

function addVideo(
    stream,
    userId
) {

    let video =
        document.getElementById(
            userId
        );

    if (!video) {

        video =
            document.createElement(
                "video"
            );

        video.id = userId;

        video.autoplay = true;

        video.playsInline = true;

        videos.appendChild(video);
    }

    video.srcObject = stream;
}
