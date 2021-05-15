import { CBOR } from 'cbor-redux';
import {ComponentContainer, GoldenLayout, JsonValue, LayoutConfig, LayoutManager, RowOrColumn} from 'golden-layout';
import {createApp, h} from 'vue';

function renderToString(object) {
    let s = `<h4>${object.displayName} <code>${object.name}: ${object.mimeType}</code></h4>`;

    if (object.imageDataUrl) {
        s += `<img src=${object.imageDataUrl}>`;
    }

    if (object.mimeType === 'application/json') {
        s += `<code>${object.data}</code>`;
    }

    return s;
}
function renderToVue(object) {
    const children = [];

    children.push(h('h4', {}, [
        object.displayName, " ",
        h('code', {}, `${object.name}: ${object.mimeType}`)]
    ));

    if (object.imageDataUrl) {
        children.push(h('img', {src: object.imageDataUrl}));
    }

    if (object.mimeType === 'application/json') {
        children.push(h('code', {}, object.data));
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

    container.layoutManager.eventHub.on("userBroadcast", object => {
        // console.log("userBroadcast", componentState.objectName, "x", object.name)

        if (componentState.objectName === object.name) {
            // container.element.innerHTML = renderToString(object);

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
    const gl = new GoldenLayout(/*document.getElementById('layout-container')*/);
    gl.registerComponentFactoryFunction( 'testComponent', initPane);
    gl.loadLayout(config);

    const windows = {};

    const MyApplication = {
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

            websocket.onopen = () => this.statusText = ("Connected");
            websocket.onclose = () => this.statusText = ("Disconnected");
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

                    if (!windows.hasOwnProperty(object.name)) {
                        var newItemConfig = {
                            type: 'component',
                            componentType: 'testComponent',
                            componentState: {/*object: object*/ objectName: object.name},
                            title: `${object.displayName} (${object.name} : ${object.mimeType})`,
                        };

                        //windows[object.name].componentState = newItemConfig.componentState;
                        //myLayout.root.contentItems[ 0 ].removeChild(windows[object.name]);
                        // updatePane(windows[object.name], {object: object});

                        // myLayout.()
                        // const ci = myLayout.createAndInitContentItem(newItemConfig, myLayout.root.contentItems[0]);
                        // const acx = myLayout.root.contentItems[ 0 ].addChild( ci );
                        (gl.rootItem as RowOrColumn).addItem(newItemConfig);
                        // console.log("ci => ", acx);
                        windows[object.name] = true;
                        // setTimeout(() => console.log(newItemConfig), 1000);
                    }

                    setTimeout(() => gl.eventHub.emit("userBroadcast", object));
                }

                // console.log("end message.");
            };
        },
        delimiters: ['[[', ']]'],
    }

    const app = createApp(MyApplication)
    const instance = app.mount("#app-container")
})
