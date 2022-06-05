const onCleanup = () => {};

// TODO: this can be done in a serviceworker
function mockURL(url) {
    return "http://localhost:3772/mock/" + url;
}

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
onCleanup(() => {
    canvas.remove();
});

const err_el = document.createElement("div");
err_el.style.display = "none";
err_el.style.backgroundColor = "red";
err_el.style.color = "white";
err_el.style.height = "100%";
err_el.style.pointerEvents = "none";
const eech = document.createElement("div");
eech.style.padding = "1rem";
eech.style.position = "fixed";
eech.style.top = "0";
eech.style.left = "0";
eech.style.right = "0";
eech.style.bottom = "0";
eech.style.transformOrigin = "top left";
eech.style.willChange = "transform";
eech.style.display = "flex";
eech.style.alignItems = "center";
eech.style.justifyContent = "center";
eech.style.fontSize = "3vw";
eech.innerHTML = "<div>The page is zoomed. Zoom out to continue.</div>";
err_el.appendChild(eech);
document.body.appendChild(err_el);

const stylel = document.createElement("style");
stylel.textContent = `
html:not(.e-zoomed), html:not(.e-zoomed) > body {
    touch-action: none;
    overflow-y: hidden;
}
`;
document.head.appendChild(stylel);

let disable_ev_lsn = false;

function onVisualViewportChange(e) {
    const value = visualViewport.scale < 0.999 || visualViewport.scale > 1.001;
    document.documentElement.classList.toggle("e-zoomed", value);
    canvas.style.display = value ? "none" : "";
    err_el.style.display = value ? "" : "none";
    disable_ev_lsn = value;

    const offset_left = visualViewport.offsetLeft;
    const offset_top = visualViewport.offsetTop;
    eech.style.transform = 'translate(' + offset_left + 'px,' + offset_top + 'px) ' + 'scale(' + 1/visualViewport.scale + ')';
}

visualViewport.addEventListener("resize", onVisualViewportChange);
visualViewport.addEventListener("scroll", onVisualViewportChange);
onCleanup(() => {
    visualViewport.removeEventListener("resize", onVisualViewportChange);
    visualViewport.removeEventListener("scroll", onVisualViewportChange);
    document.documentElement.classList.remove("e-zoomed");
    disable_ev_lsn = true;
    cleanupGesRec();
});

const a = DOMMatrix

let transform = new DOMMatrixReadOnly();

function screenToWorldPos(spx, spy) {
    const res = transform.inverse().transformPoint({x: spx, y: spy});
    return {x: res.x, y: res.y};
}

window.udm = (cb) => {transform = cb(transform)};

window.addEventListener("wheel", e => {
    if(disable_ev_lsn) return;
    e.preventDefault();

    if(e.ctrlKey) {
        // scale
        const wheel = -e.deltaY / 60;
        const zoom = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1)

        const fsetx = e.clientX;
        const fsety = e.clientY;
        
        const cpos = screenToWorldPos(fsetx, fsety);

        transform = transform.scale(zoom);

        const fpos = screenToWorldPos(fsetx, fsety);

        transform = transform.translate(fpos.x - cpos.x, fpos.y - cpos.y);
    }else{
        // pan
        transform = new DOMMatrixReadOnly().translate(-e.deltaX, -e.deltaY).multiply(transform);
        rerender();
    }
}, {passive: false});
const cleanupGesRec = recognizeGestures((ptr, ges) => {
    if(disable_ev_lsn) return;
    if(ptr === "mouse") return;

    if(ges.kind === "pan") {
        if(ges.points.length < 2) return;
        // note: this is *incorrect*
        // we should probably change recognizeGestures to have a start/update/end thing instead of this
        const seclast = ges.points[ges.points.length - 2];
        const last = ges.points[ges.points.length - 1];
        const dx = seclast[0] - last[0];
        const dy = seclast[1] - last[1];
        transform = new DOMMatrixReadOnly().translate(-dx, -dy).multiply(transform);
        rerender();
    }else{
        console.log("got unknown gesture", ptr, ges);
    }
});

const ctx = canvas.getContext("2d");

let new_frame_needed = false;
let new_frame_requested = null;
function rerender() {
    if(new_frame_requested != null) {
        new_frame_needed = true;
        return;
    }
    new_frame_needed = false;
    new_frame_requested = requestAnimationFrame(() => {
        new_frame_requested = null;
        if(new_frame_needed) {
            rerender();
        }
    });
    ctx.save();

    // ctx.fillStyle = "#18181B";
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    view.render(ctx, 0, 0, canvas.width, canvas.height);
    // view.render(ctx);
}

class Component {
    constructor(props) {
        this.props = props;
    }
    setProps(props) {
        this.props = {...props};
    }
    getProps() {
        return {...this.props};
    }

    clean(prop, cb) {
        const cleans = this.cleans ??= new Set();
        if(cleans.has(prop)) return;
        cb();
    }
    setDirty() {
        // TODO ??
        rerender();
    }
};

class PanView extends Component {
    render(ctx, x, y, w, h) {
        ctx.save();
        ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
        this.props.child.render(ctx, x, y);

        // ctx.fillStyle = "white";
        // const pos = screenToWorldPos(10, 10);
        // ctx.fillRect(pos.x, pos.y, 10, 10);
        
        ctx.restore();
    }
};
class HLayout extends Component {
    render(ctx, x, y) {
        for(const child of this.props.children) {
            child.render(ctx, x, y);
        }
    }
};
class LabelView extends Component {
    render(ctx, x, y) {
        // TODO
    }
};
class ImageView extends Component {
    /**
     * @param {CanvasRenderingContext2D} ctx
    */
    render(ctx, x, y) {
        if(this.img == null) {
            this.img = document.createElement("img");
            this.img.onload = () => {
                this.setDirty();
            };
        }
        this.clean("src", () => {
            // this.img.src = mockURL(this.props.url);
            this.img.src = this.props.url;
        });
        
        ctx.save();
        ctx.fillStyle = "white";
        ctx.fillRect(x, y, this.props.w, this.props.h);
        ctx.drawImage(this.img, x, y, this.props.w, this.props.h);
        ctx.restore();
    }
};

const view = new PanView({child: new HLayout({children: [
    new LabelView({text: "Hi"}),
    // the zoom view should let us two finger zoom and it should move the stuff above and below up/down the
    // screen. it should keep the scroll such that the image appears centered.
    // new ZoomView({child: })
    new ImageView({alt: "alt text", w: 688, h: 1031, url: "https://images.unsplash.com/photo-1525824236856-8c0a31dfe3be?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=688&q=80"}),
    new LabelView({text: "Text below"}),
]})});

canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.display = "block";
canvas.style.objectFit = "none";
canvas.style.objectPosition = "top left";

// const view = new UIView();
// view.add(new UILabel("Test"));

if(!('requestIdleCallback' in window)) {
    window.requestIdleCallback = a => void a();
    window.cancelIdleCallback = () => {};
}
let rsic;
new ResizeObserver((itms) => {
    itms.forEach(itm => {
        if(itm.target === canvas) {
            if(rsic != null) cancelIdleCallback(rsic);
            rsic = requestIdleCallback(() => {
                canvas.width = itm.contentRect.width;
                canvas.height = itm.contentRect.height;
                rerender();
            }, {
                timeout: 500,
            });
        }
    });
}).observe(canvas);

function main() {
    rerender();
}

// const view2 = [
//     new ViewComponent([
//         new ButtonComponent(),
//     ]),
// ];

// oh actually why don't we just
// const view = [solid js array] and render that directly

function renderImage(ctx, x, y, w, h) {
    // 1: download the image (and display a progress bar in place of it)
    // 2: make an image element from it
    // 3: make the blurred background copy element
}

main();


// ok the goal:
// - we'll make a "quick simple" retained ui thing
//   - quick simple as in it doesn't need nearly as many design decisions as trying to do
//     something like an immediate mode ui thing
// - we'll hook it up with a solid js like thing
