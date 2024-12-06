/**
 * @name donate-rerolls-plugin
 * @version 14.23
 * @description Donate rerolls button for Pengu Loader.
 * @author kemo
 * @link https://github.com/kem0x/donate-rerolls
 */

/*
Auto pick fav champions on available list
^ if possible, set weight for champions or order

Auto Accept Swap
^ option to only accept if option is fav champion
*/

import "./style.css";

const delay = (t) => new Promise((r) => setTimeout(r, t));

const getCurrentSession = async () =>
    await fetch(
        "/lol-champ-select/v1/session",
    ).then((r) => r.json());

let _donateButton = null;

async function rerollAndSwapTo(championId) {
    await fetch(
        "/lol-champ-select/v1/session/my-selection/reroll",
        {
            method: "POST",
        },
    );

    await fetch(
        `/lol-champ-select/v1/session/bench/swap/${championId}`,
        {
            method: "POST",
        },
    );
}

async function onButton() {
    let session = await getCurrentSession();

    let myCellId = session.localPlayerCellId;
    let myIndex = session.myTeam.findIndex((x) => x.cellId === myCellId);
    let me = session.myTeam[myIndex];

    await rerollAndSwapTo(me.championId);

    session = await getCurrentSession();

    if (session.rerollsRemaining == 0) {
        _donateButton.setAttribute("disabled", "");
        return;
    }
}

async function mount() {
    while (!document.querySelector(".timer-container")) {
        await delay(100);
    }

    let session = await getCurrentSession();

    if (!session.allowRerolling) {
        return;
    }

    if (_donateButton) {
        if (session.rerollsRemaining == 0) {
            _donateButton.setAttribute("disabled", "");
        } else if (_donateButton.hasAttribute("disabled")) {
            _donateButton.removeAttribute("disabled");
        }
        return;
    }

    if (document.querySelector(".donate-icon")) {
        return;
    }

    _donateButton = document.createElement("lol-uikit-flat-button");
    _donateButton.style.paddingTop = "5px";

    const contentWrapper = document.createElement("div");
    contentWrapper.classList.add("team-boost-content-wrapper");

    const icon = document.createElement("div");
    icon.classList.add("donate-icon");

    contentWrapper.textContent = "Donate Reroll";

    _donateButton.appendChild(contentWrapper);

    contentWrapper.appendChild(icon);

    document.querySelector(".timer-container").after(_donateButton);

    if (session.rerollsRemaining == 0) {
        _donateButton.setAttribute("disabled", "");
    }

    _donateButton.onclick = async () => await onButton();
}

async function load() {
    const link = document.querySelector(
        'link[rel="riot:plugins:websocket"]',
    );

    const ws = new WebSocket(link.href, "wamp");

    const EP_GAMEFLOW = "OnJsonApiEvent/lol-gameflow/v1/gameflow-phase".replace(
        /\//g,
        "_",
    );

    ws.onopen = () => {
        ws.send(JSON.stringify([5, EP_GAMEFLOW]));
    };

    ws.onmessage = (e) => {
        const [, endpoint, { data }] = JSON.parse(e.data);
        if (endpoint === EP_GAMEFLOW) {
            if (data === "ChampSelect") {
                mount();
            } else if (data === "None") {
                if (_donateButton) {
                    if (_donateButton.hasAttribute("disabled")) {
                        _donateButton.removeAttribute("disabled");
                    }
                    _donateButton.remove();
                }
            }
        }
    };
}

window.addEventListener("load", load);
