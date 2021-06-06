import { CBOR } from 'cbor-redux';
import {
    ComponentContainer,
    ComponentItemConfig,
    GoldenLayout,
    LayoutConfig,
    RowOrColumn
} from 'golden-layout';
import {createApp, h, Component} from 'vue';

declare const EXCHANGE_NAME: string;

// function renderToString(object) {
//     let s = `<h4>${object.displayName} <code>${object.name}: ${object.mimeType}</code></h4>`;

//     if (object.imageDataUrl) {
//         s += `<img src=${object.imageDataUrl}>`;
//     }

//     if (object.mimeType === 'application/json') {
//         s += `<code>${object.data}</code>`;
//     }

//     return s;
// }

function tsimUnitStateMultipleHandler(object) {
    const children = [];

    // children.push(h('h4', {}, [
    //     object.displayName, " ",
    //     h('code', {}, `${object.name}: ${object.mimeType}`)]
    // ));

    children.push(h('code', {style: "white-space: pre;"}, JSON.stringify(object.data, null, 2)));
    // children.push(h('code', {}, [h('pre', {}, JSON.stringify(object.data, null, 2))]));

    return h('div', {}, children);
}

const mimeMapping = {
    "TSIM.ControlSystemStateMap": tsimUnitStateMultipleHandler
};

function renderToVue(object) {
    if (mimeMapping.hasOwnProperty(object.mimeType)) {
        return mimeMapping[object.mimeType](object);
    }

    const children = [];

    // children.push(h('h4', {}, [
    //     object.displayName, " ",
    //     h('code', {}, `${object.name}: ${object.mimeType}`)]
    // ));

    if (object.imageDataUrl) {
        children.push(h('img', {src: object.imageDataUrl}));
    }
    else if (object.mimeType === 'application/json') {
        children.push(h('code', {}, object.data));
    }
    else {
        children.push(h('div', {}, "Unrecognized object type"));
    }

    return h('div', {}, children);
}

const initPane = function(container: ComponentContainer, componentState) {
    // const object = componentState.object;

    // if (!object || !object.displayName) {
    //     return;
    // }

    // console.log(`<h4>${object.displayName} <code>${object.name}: ${object.mimeType}</code></h4>`);

    const app = createApp({
        data() {
            return {objectData: null};
        },
        render() {
            return this.objectData ? renderToVue(this.objectData) : "";
        }
    })

//     app.component('componentx', {
//         data() {
//             return {object: null};
//         },
//         render() {
//             return renderToString(this.object);
//         }
// //         template: `
// // <h4>{{object.displayName}} <code>{{object.name}}: {{object.mimeType}}</code></h4>
// //
// // <img v-if="object.imageDataUrl" v-bind:src="object.imageDataUrl">
// //         `,
//     })

    // container.element.innerHTML = "<componentx v-bind:object='object'></componentx>"
    const appInst = app.mount(container.element)

    container.layoutManager.eventHub.on("userBroadcast", (object: any) => {
        // console.log("userBroadcast", componentState.objectName, "x", object.name)

        if (componentState.objectName === object.name) {
            // container.element.innerHTML = renderToString(object);

            // @ts-ignore
            appInst.objectData = object;
        }
    });
}

// const updatePane = function( contentItem, componentState ){
//     const object = componentState.object;
//
//     // if (!object || !object.displayName) {
//     //     return;
//     // }
//
//     // console.log(`<h4>${object.displayName} <code>${object.name}: ${object.mimeType}</code></h4>`);
//
//     if (object.imageDataUrl) {
//         contentItem.element.find('img').attr('src', object.imageDataUrl);
//     }
//
//     if (object.mimeType === 'application/json') {
//         contentItem.element.find('code').text(object.data);
//     }
// }

const config: LayoutConfig = {
    root: {
        type: 'row',
        content:[/*{
                type: 'component',
                componentName: 'testComponent',
                componentState: { label: 'A' }
            }*//*,{
                type: 'column',
                content:[{
                    type: 'component',
                    componentName: 'testComponent',
                    componentState: { label: 'B' }
                },{
                    type: 'component',
                    componentName: 'testComponent',
                    componentState: { label: 'C' }
                }]
            }*/]
    }
};

window.addEventListener("load", () => {
    const container = document.getElementById('layout-container');
    const gl = new GoldenLayout(container);
    gl.registerComponentFactoryFunction( 'testComponent', initPane);

    window.addEventListener("resize", () => {
        console.log(container.clientWidth, container.clientHeight);
        gl.setSize(container.clientWidth, container.clientHeight);
    })

    const savedStateKey = 'savedState.' + EXCHANGE_NAME;
    const savedState = localStorage.getItem(savedStateKey);

    if (savedState !== null) {
        // console.log("LOAD", savedState);
        gl.loadLayout(JSON.parse(savedState));
    } else {
        gl.loadLayout(config);
    }

    gl.on('stateChanged', () => {
        const state = JSON.stringify(gl.saveLayout());
        // console.log('savedState', state);
        localStorage.setItem(savedStateKey, state);
    });

    function createComponentIfNotExists(gl: GoldenLayout, id: string, title: string): void {
        // Try to look up component by ID, and if not found, create it & add to the layout
        const component = gl.findFirstComponentItemById(id);
        // console.log(id, "=>", component);

        if (component === undefined) {
            const newItemConfig: ComponentItemConfig = {
                id: id,
                type: 'component',
                componentType: 'testComponent',
                componentState: {objectName: id},
                title: title,
            };

            (gl.rootItem as RowOrColumn).addItem(newItemConfig);
        }
    }

    const MyApplication: Component = {
        data() {
            return {
                data: null,
                statusText: "Initializing",
            }
        },
        // computed() {
        //     return {
        //         infoDataJson: JSON.stringify(this.infoData, null, 4)
        //     }
        // },
        created() {
            this.statusText = "Connecting to WebSocket";

            // TODO: https://stackoverflow.com/questions/10406930/how-to-construct-a-websocket-uri-relative-to-the-page-uri
            const websocket = new WebSocket("ws://localhost:5000/ws");
            websocket.binaryType = "arraybuffer";

            websocket.onopen = () => this.statusText = ("Connected to " + websocket.url);
            websocket.onclose = (ev: CloseEvent) => this.statusText = ("Connection lost.");
            websocket.onerror = (err) => this.statusText = ("Error: " + err.toString());

            websocket.onmessage = (event) => {
                // console.log("message1"); //return;
                const message = CBOR.decode(event.data);
                // console.log("message2");

                // this.data = message;

                for (const object of message.objects) { //continue;
                    if (object.mimeType === "image/png") {
                        object.imageDataUrl = URL.createObjectURL(
                            new Blob([object.data], {type: object.mimeType})
                        );
                    }

                    createComponentIfNotExists(gl, object.name, `${object.displayName} (${object.name} : ${object.mimeType})`);

                    setTimeout(() => gl.eventHub.emit("userBroadcast", object));
                }

                // console.log("end message.");
            };
        },
        delimiters: ['[[', ']]'],
    }

    const app = createApp(MyApplication)
    const instance = app.mount("#top-bar")
})
