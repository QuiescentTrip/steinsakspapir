
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\game.svelte generated by Svelte v3.19.1 */

    const file = "src\\game.svelte";

    // (45:0) {#if msg == ""}
    function create_if_block_1(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Stein Saks Papir!";
    			attr_dev(h1, "class", "svelte-1brcorj");
    			add_location(h1, file, 45, 1, 990);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(45:0) {#if msg == \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (61:1) {#if msg != ""}
    function create_if_block(ctx) {
    	let h1;
    	let t1;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "PC valgte";
    			t1 = space();
    			img = element("img");
    			attr_dev(h1, "class", "svelte-1brcorj");
    			add_location(h1, file, 61, 1, 1408);
    			if (img.src !== (img_src_value = /*AI_bilde*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "pc_bilde");
    			attr_dev(img, "class", "svelte-1brcorj");
    			add_location(img, file, 62, 1, 1429);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*AI_bilde*/ 8 && img.src !== (img_src_value = /*AI_bilde*/ ctx[3])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(61:1) {#if msg != \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let t0;
    	let h1;
    	let t1;
    	let t2;
    	let div;
    	let button0;
    	let img0;
    	let img0_src_value;
    	let t3;
    	let button1;
    	let img1;
    	let img1_src_value;
    	let t4;
    	let button2;
    	let img2;
    	let img2_src_value;
    	let t5;
    	let p;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let dispose;
    	let if_block0 = /*msg*/ ctx[1] == "" && create_if_block_1(ctx);
    	let if_block1 = /*msg*/ ctx[1] != "" && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			h1 = element("h1");
    			t1 = text(/*msg*/ ctx[1]);
    			t2 = space();
    			div = element("div");
    			button0 = element("button");
    			img0 = element("img");
    			t3 = space();
    			button1 = element("button");
    			img1 = element("img");
    			t4 = space();
    			button2 = element("button");
    			img2 = element("img");
    			t5 = space();
    			p = element("p");
    			t6 = text("Du har vunnet ");
    			t7 = text(/*vunnet*/ ctx[2]);
    			t8 = text(" ut av ");
    			t9 = text(/*runder*/ ctx[0]);
    			t10 = text(" runder");
    			t11 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h1, "class", "svelte-1brcorj");
    			add_location(h1, file, 47, 1, 1026);
    			if (img0.src !== (img0_src_value = /*stein*/ ctx[6])) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "stein");
    			attr_dev(img0, "class", "svelte-1brcorj");
    			add_location(img0, file, 50, 2, 1098);
    			attr_dev(button0, "id", "stein");
    			attr_dev(button0, "class", "svelte-1brcorj");
    			add_location(button0, file, 49, 1, 1051);
    			if (img1.src !== (img1_src_value = /*saks*/ ctx[5])) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "saks");
    			attr_dev(img1, "class", "svelte-1brcorj");
    			add_location(img1, file, 53, 2, 1189);
    			attr_dev(button1, "id", "saks");
    			attr_dev(button1, "class", "svelte-1brcorj");
    			add_location(button1, file, 52, 1, 1144);
    			if (img2.src !== (img2_src_value = /*papir*/ ctx[4])) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "papir");
    			attr_dev(img2, "class", "svelte-1brcorj");
    			add_location(img2, file, 56, 2, 1280);
    			attr_dev(button2, "id", "papir");
    			attr_dev(button2, "class", "svelte-1brcorj");
    			add_location(button2, file, 55, 1, 1233);
    			add_location(div, file, 48, 1, 1043);
    			add_location(p, file, 59, 1, 1335);
    			attr_dev(main, "class", "svelte-1brcorj");
    			add_location(main, file, 43, 0, 964);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t0);
    			append_dev(main, h1);
    			append_dev(h1, t1);
    			append_dev(main, t2);
    			append_dev(main, div);
    			append_dev(div, button0);
    			append_dev(button0, img0);
    			append_dev(div, t3);
    			append_dev(div, button1);
    			append_dev(button1, img1);
    			append_dev(div, t4);
    			append_dev(div, button2);
    			append_dev(button2, img2);
    			append_dev(main, t5);
    			append_dev(main, p);
    			append_dev(p, t6);
    			append_dev(p, t7);
    			append_dev(p, t8);
    			append_dev(p, t9);
    			append_dev(p, t10);
    			append_dev(main, t11);
    			if (if_block1) if_block1.m(main, null);

    			dispose = [
    				listen_dev(button0, "click", /*spillstein*/ ctx[7], false, false, false),
    				listen_dev(button1, "click", /*spillsaks*/ ctx[8], false, false, false),
    				listen_dev(button2, "click", /*spillpapir*/ ctx[9], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*msg*/ ctx[1] == "") {
    				if (!if_block0) {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(main, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*msg*/ 2) set_data_dev(t1, /*msg*/ ctx[1]);
    			if (dirty & /*vunnet*/ 4) set_data_dev(t7, /*vunnet*/ ctx[2]);
    			if (dirty & /*runder*/ 1) set_data_dev(t9, /*runder*/ ctx[0]);

    			if (/*msg*/ ctx[1] != "") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(main, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let runder = 0;
    	let msg = "";
    	let vunnet = 0;
    	let papir = "./bilder/papir.jpg";
    	let saks = "./bilder/saks.jpg";
    	let stein = "./bilder/stein.jpg";
    	let AI_bilde = "";
    	let pc_valg;
    	let list = [stein, saks, papir];

    	function vant() {
    		$$invalidate(1, msg = "Du vant!");
    		$$invalidate(0, runder += 1);
    		$$invalidate(2, vunnet += 1);
    	}

    	function tapte() {
    		$$invalidate(1, msg = "Du tapte!");
    		$$invalidate(0, runder += 1);
    		$$invalidate(2, vunnet += 0);
    	}

    	function ujevnt() {
    		$$invalidate(1, msg = "Ujevnt!");
    		$$invalidate(0, runder += 1);
    		$$invalidate(2, vunnet += 0.5);
    	}

    	function spillstein() {
    		pc_valg = Math.floor(Math.random() * 3);

    		if (pc_valg == 0) {
    			ujevnt();
    		} else if (pc_valg == 1) {
    			vant();
    		} else {
    			tapte();
    		}

    		$$invalidate(3, AI_bilde = list[pc_valg]);
    	}

    	function spillsaks() {
    		pc_valg = Math.floor(Math.random() * 3);

    		if (pc_valg == 1) {
    			ujevnt();
    		} else if (pc_valg == 2) {
    			vant();
    		} else {
    			tapte();
    		}

    		$$invalidate(3, AI_bilde = list[pc_valg]);
    	}

    	function spillpapir() {
    		pc_valg = Math.floor(Math.random() * 3);

    		if (pc_valg == 2) {
    			ujevnt();
    		} else if (pc_valg == 0) {
    			vant();
    		} else {
    			tapte();
    		}

    		$$invalidate(3, AI_bilde = list[pc_valg]);
    	}

    	$$self.$capture_state = () => ({
    		runder,
    		msg,
    		vunnet,
    		papir,
    		saks,
    		stein,
    		AI_bilde,
    		pc_valg,
    		list,
    		vant,
    		tapte,
    		ujevnt,
    		spillstein,
    		spillsaks,
    		spillpapir,
    		Math
    	});

    	$$self.$inject_state = $$props => {
    		if ("runder" in $$props) $$invalidate(0, runder = $$props.runder);
    		if ("msg" in $$props) $$invalidate(1, msg = $$props.msg);
    		if ("vunnet" in $$props) $$invalidate(2, vunnet = $$props.vunnet);
    		if ("papir" in $$props) $$invalidate(4, papir = $$props.papir);
    		if ("saks" in $$props) $$invalidate(5, saks = $$props.saks);
    		if ("stein" in $$props) $$invalidate(6, stein = $$props.stein);
    		if ("AI_bilde" in $$props) $$invalidate(3, AI_bilde = $$props.AI_bilde);
    		if ("pc_valg" in $$props) pc_valg = $$props.pc_valg;
    		if ("list" in $$props) list = $$props.list;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		runder,
    		msg,
    		vunnet,
    		AI_bilde,
    		papir,
    		saks,
    		stein,
    		spillstein,
    		spillsaks,
    		spillpapir
    	];
    }

    class Game extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Game",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.19.1 */
    const file$1 = "src\\App.svelte";

    // (18:0) {#if !ingame && !ferdig}
    function create_if_block_2(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let input;
    	let t2;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Vennligst velg antall runder";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Neste";
    			attr_dev(h1, "class", "svelte-6wjt63");
    			add_location(h1, file$1, 19, 1, 335);
    			add_location(input, file$1, 20, 1, 375);
    			add_location(button, file$1, 21, 1, 414);
    			attr_dev(main, "class", "svelte-6wjt63");
    			add_location(main, file$1, 18, 0, 326);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, input);
    			set_input_value(input, /*antall_runder*/ ctx[0]);
    			append_dev(main, t2);
    			append_dev(main, button);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    				listen_dev(button, "click", /*spillet*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*antall_runder*/ 1 && input.value !== /*antall_runder*/ ctx[0]) {
    				set_input_value(input, /*antall_runder*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(18:0) {#if !ingame && !ferdig}",
    		ctx
    	});

    	return block;
    }

    // (25:0) {#if ingame && !ferdig}
    function create_if_block_1$1(ctx) {
    	let current;
    	const game = new Game({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(game.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(game, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(game.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(game.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(game, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(25:0) {#if ingame && !ferdig}",
    		ctx
    	});

    	return block;
    }

    // (28:0) {#if ferdig}
    function create_if_block$1(ctx) {
    	let main;
    	let h1;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "du er ferdig!";
    			attr_dev(h1, "class", "svelte-6wjt63");
    			add_location(h1, file$1, 29, 0, 544);
    			attr_dev(main, "class", "svelte-6wjt63");
    			add_location(main, file$1, 28, 0, 536);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(28:0) {#if ferdig}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = !/*ingame*/ ctx[2] && !/*ferdig*/ ctx[1] && create_if_block_2(ctx);
    	let if_block1 = /*ingame*/ ctx[2] && !/*ferdig*/ ctx[1] && create_if_block_1$1(ctx);
    	let if_block2 = /*ferdig*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*ingame*/ ctx[2] && !/*ferdig*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*ingame*/ ctx[2] && !/*ferdig*/ ctx[1]) {
    				if (!if_block1) {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				} else {
    					transition_in(if_block1, 1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*ferdig*/ ctx[1]) {
    				if (!if_block2) {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let antall_runder;
    	let ferdig = false;
    	let ingame = false;

    	function spillet() {
    		$$invalidate(2, ingame = !ingame);
    	}

    	console.log(Game);

    	function input_input_handler() {
    		antall_runder = this.value;
    		$$invalidate(0, antall_runder);
    	}

    	$$self.$capture_state = () => ({
    		Game,
    		runder: Game,
    		antall_runder,
    		ferdig,
    		ingame,
    		spillet,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("antall_runder" in $$props) $$invalidate(0, antall_runder = $$props.antall_runder);
    		if ("ferdig" in $$props) $$invalidate(1, ferdig = $$props.ferdig);
    		if ("ingame" in $$props) $$invalidate(2, ingame = $$props.ingame);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*antall_runder, ingame*/ 5) {
    			 if (antall_runder == Game && ingame) {
    				$$invalidate(1, ferdig = true);
    				$$invalidate(2, ingame = !ingame);
    			}
    		}
    	};

    	return [antall_runder, ferdig, ingame, spillet, input_input_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
