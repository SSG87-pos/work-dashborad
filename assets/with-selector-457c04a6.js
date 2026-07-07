import{r as b,k as x}from"./index-61e0de85.js";var h={exports:{}},w={},$={exports:{}},j={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var i=b;function V(e,r){return e===r&&(e!==0||1/e===1/r)||e!==e&&r!==r}var D=typeof Object.is=="function"?Object.is:V,R=i.useState,O=i.useEffect,g=i.useLayoutEffect,z=i.useDebugValue;function I(e,r){var u=r(),a=R({inst:{value:u,getSnapshot:r}}),t=a[0].inst,n=a[1];return g(function(){t.value=u,t.getSnapshot=r,m(t)&&n({inst:t})},[e,u,r]),O(function(){return m(t)&&n({inst:t}),e(function(){m(t)&&n({inst:t})})},[e]),z(u),u}function m(e){var r=e.getSnapshot;e=e.value;try{var u=r();return!D(e,u)}catch{return!0}}function M(e,r){return r()}var _=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?M:I;j.useSyncExternalStore=i.useSyncExternalStore!==void 0?i.useSyncExternalStore:_;$.exports=j;var k=$.exports;/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var d=b,C=k;function G(e,r){return e===r&&(e!==0||1/e===1/r)||e!==e&&r!==r}var L=typeof Object.is=="function"?Object.is:G,F=C.useSyncExternalStore,U=d.useRef,W=d.useEffect,A=d.useMemo,B=d.useDebugValue;w.useSyncExternalStoreWithSelector=function(e,r,u,a,t){var n=U(null);if(n.current===null){var c={hasValue:!1,value:null};n.current=c}else c=n.current;n=A(function(){function E(o){if(!S){if(S=!0,l=o,o=a(o),t!==void 0&&c.hasValue){var f=c.value;if(t(f,o))return v=f}return v=o}if(f=v,L(l,o))return f;var y=a(o);return t!==void 0&&t(f,y)?(l=o,f):(l=o,v=y)}var S=!1,l,v,p=u===void 0?null:u;return[function(){return E(r())},p===null?void 0:function(){return E(p())}]},[r,u,a,t]);var s=F(e,n[0],n[1]);return W(function(){c.hasValue=!0,c.value=s},[s]),B(s),s};h.exports=w;var H=h.exports;const K=x(H);export{K as u};
