System.register(["jimu-core/emotion","jimu-core","jimu-ui","jimu-theme"],function(e,t){var i={},n={},o={},s={};return{setters:[function(e){i.jsx=e.jsx,i.jsxs=e.jsxs},function(e){n.AppMode=e.AppMode,n.Immutable=e.Immutable,n.PermissionList=e.PermissionList,n.React=e.React,n.ReactRedux=e.ReactRedux,n.SessionManager=e.SessionManager,n.SessionType=e.SessionType,n.SignInErrorCode=e.SignInErrorCode,n.css=e.css,n.getAppStore=e.getAppStore,n.urlUtils=e.urlUtils,n.utils=e.utils},function(e){o.Button=e.Button,o.DistanceUnits=e.DistanceUnits,o.DropdownItem=e.DropdownItem,o.Icon=e.Icon,o.Paper=e.Paper,o.Popper=e.Popper,o.defaultMessages=e.defaultMessages,o.styleUtils=e.styleUtils},function(e){s.styled=e.styled}],execute:function(){e((()=>{var e={137(e){e.exports="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjI2cHgiIGhlaWdodD0iMjZweCIgdmlld0JveD0iMCAwIDI2IDI2IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDwhLS0gR2VuZXJhdG9yOiBTa2V0Y2ggNTkuMSAoODYxNDQpIC0gaHR0cHM6Ly9za2V0Y2guY29tIC0tPg0KICAgIDx0aXRsZT5EZWZhdWx0IHVzZXI8L3RpdGxlPg0KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPg0KICAgIDxnIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPg0KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTM5OC4wMDAwMDAsIC0xMi4wMDAwMDApIj4NCiAgICAgICAgICAgIDxnPg0KICAgICAgICAgICAgICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzOTguMDAwMDAwLCAxMi4wMDAwMDApIj4NCiAgICAgICAgICAgICAgICAgICAgPGNpcmNsZSBmaWxsPSIjNkE2QTZBIiBjeD0iMTMiIGN5PSIxMyIgcj0iMTMiPjwvY2lyY2xlPg0KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTMsMTcgQzE2Ljg4OTExNTEsMTcgMjAuMjU5NjkyMywxOS4yMjAxMjQ4IDIxLjkxMzQ5NywyMi40NjIxMzk3IEMxOS41ODU3NjIyLDI0LjY1NjIzODggMTYuNDQ5ODA3MiwyNiAxMywyNiBDOS41NDk4NzgzMSwyNiA2LjQxMzY2NjA4LDI0LjY1NTk5MzggNC4wODYzNjQyMywyMi40NjI5ODI0IEM1Ljc0MDMwNzY4LDE5LjIyMDEyNDggOS4xMTA4ODQ4OCwxNyAxMywxNyBaIE0xMyw1IEMxNS43NjE0MjM3LDUgMTgsNy4yMzg1NzYyNSAxOCwxMCBDMTgsMTIuNzYxNDIzNyAxNS43NjE0MjM3LDE1IDEzLDE1IEMxMC4yMzg1NzYzLDE1IDgsMTIuNzYxNDIzNyA4LDEwIEM4LDcuMjM4NTc2MjUgMTAuMjM4NTc2Myw1IDEzLDUgWiIgZmlsbD0iI0E4QThBOCI+PC9wYXRoPg0KICAgICAgICAgICAgICAgIDwvZz4NCiAgICAgICAgICAgIDwvZz4NCiAgICAgICAgPC9nPg0KICAgIDwvZz4NCjwvc3ZnPg=="},79244(e){"use strict";e.exports=n},67386(e){"use strict";e.exports=i},1888(e){"use strict";e.exports=s},14321(e){"use strict";e.exports=o}},t={};function l(i){var n=t[i];if(void 0!==n)return n.exports;var o=t[i]={exports:{}};return e[i](o,o.exports,l),o.exports}l.d=(e,t)=>{for(var i in t)l.o(t,i)&&!l.o(e,i)&&Object.defineProperty(e,i,{enumerable:!0,get:t[i]})},l.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),l.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},l.p="";var r={};return l.p=window.jimuConfig.baseUrl,(()=>{"use strict";l.r(r),l.d(r,{__set_webpack_public_path__:()=>L,default:()=>O});var e=l(67386),t=l(79244),i=l(14321);function n(e){return t.css`

    .login-button-box {
      .login-button {
        width: 100%;
        height: 100%;
        // padding for default auto style
        padding: 12px 24px;
        //border-radius: ${e.sys.shape.shape2};
      }
      .avatar-icon {
        margin: 0 4px;
      }
      .user-name {
        margin: 0 4px;
      }
    }

    .login-dropdown-box {
      width: 250px;
      color: unset;
      background: unset;
      .login-dropdown-item {
        &:hover {
          background: none;
          color: unset;
          text-decoration: none;
        }
      }

      .login-dropdown-item.header-item {
        .header-portrait {
          width: 48px;
          min-height: 48px;
          margin-right: 8px;
        }
        .user-info-content {
          align-items: center;
        }
        .user-title-content {
          //line-height: 22px;
          justify-content: flex-end;
          padding: 0 8px;
          .user-title{
            margin: 2px 0;
            max-width: 130px;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
          }
          .main-title {
            //font-weight: 600;
          }
          .sub-title {
          }
        }
      }

      .login-dropdown-item.link-item {
        min-height: 40px;
        &:hover {
          color: ${e.sys.color.primary.text};
          background: ${e.sys.color.primary.main};
        }
      }
      .login-dropdown-item.link-item.disabled {
        color: unset;
        &:hover {
          color: ${e.sys.color.primary.text};
          background: ${e.sys.color.primary.main};
        }
      }

      .login-dropdown-item.jimu-dropdown-item-divider {
        border-top-color : ${e.sys.color.divider.tertiary};
      }

      .permission-list-title {
        padding: 0 12px;
      }
      .permission-list {
         max-height: 250px;
        .banner-list-item-content {
          display: block;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1px;
          position: relative;
          font-size: 12px;
          .item-info {
            flex-grow: 2;
            .fold-btn {
              .directional {
                width: 8px;
                height: 8px;
              }
            }
          }
          .item-info{
            display: flex;
            align-items: center;
          }
          .item-link {
            display: block;
            max-width: 200px;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
            padding: 4px 0;
          }
          .item-link.sub-item-link {
            max-width: 230px;
            padding-left: 26px;
          }
          .item-operation {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            .item-operation-btn {
              //height: 20px;
              //font-size: 12px;
            }
          }
          .button-separator {
            height: 18px;
            border-right-width: 1px;
            border-right-style: solid;
            border-right-color: var(--sys-color-divider-secondary)
          }
        }
        .user-name-content {
          justify-content: flex-end;
          padding: 0 16px;
          .user-name {
            //font-size: 12px;
            font-style: italic;
          }
        }
      }

    }
  `}function o(e,n,o,l,r){let a,d;const g=e.regular,c=i.styleUtils.toCSSStyle(g&&g.without("iconProps").asMutable({deep:!0})),u=e.hover,p=i.styleUtils.toCSSStyle(u&&u.without("iconProps").asMutable({deep:!0})),m=Object.assign(Object.assign({},c),p),f=e.dropdownRegular,I=i.styleUtils.toCSSStyle(f&&f.without("iconProps").asMutable({deep:!0})),y=e.dropdownHover,x=i.styleUtils.toCSSStyle(y&&y.without("iconProps").asMutable({deep:!0})),h=Object.assign(Object.assign({},I),x);o&&l!==t.AppMode.Run?(a=r?Object.assign(Object.assign({},s(c)),s(m)):c,d=r?Object.assign(Object.assign({},s(I)),s(h)):I):(a=c,d=I);const v=function(e,n,o,s,l){const r=null==e?void 0:e.regular,a=null==e?void 0:e.hover;let d,g;o&&s!==t.AppMode.Run?(d=l?Object.assign(Object.assign({},null==r?void 0:r.iconProps),null==a?void 0:a.iconProps):null==r?void 0:r.iconProps,g=null==a?void 0:a.iconProps):(d=null==r?void 0:r.iconProps,g=null==a?void 0:a.iconProps);const c=d||{},u=g||{};return{regularStyle:{color:c.color,fill:c.color,width:`${c.size}${i.DistanceUnits.PIXEL}`,height:`${c.size}${i.DistanceUnits.PIXEL}`},hoverStyle:{color:u.color,fill:u.color,width:`${u.size}${i.DistanceUnits.PIXEL}`,height:`${u.size}${i.DistanceUnits.PIXEL}`}}}(e,0,o,l,r);return{isConfiguringHover:r,regularStyle:a,hoverStyle:m,dropdownRegularStyle:d,dropdownHoverStyle:h,iconStyle:v}}const s=e=>{if(!e)return e;const t={};return Object.keys(e).forEach(i=>{("string"==typeof e[i]&&!e[i].includes("undefined")||"number"==typeof e[i])&&(t[i]=e[i])}),t};var a,d;function g(){return!!t.SessionManager.getInstance().getMainSession()}function c(e=!1,i){if(window.jimuConfig.isInBuilder||g())return;t.utils.isInIFrame()&&(e=!0);const n=window.location.href,o=(0,t.getAppStore)().getState().queryObject,s=i&&t.urlUtils.getHrefFromLinkTo(i,o),l=(null==i?void 0:i.openType)||"_self",r="_self"===l&&s?s:e?null:n,a="_blank"===l&&s?s:null,d="_top"===l&&s?s:null;t.SessionManager.getInstance().signIn({popup:e,fromUrl:r,redirectUrlInNewWindow:a,redirectUrlInTopWindow:d,forceLogin:!0})}function u(e,i){if(window.jimuConfig.isInBuilder||!g())return;const n=t.SessionManager.getInstance();i&&n.getSessions().forEach(e=>{const i=n.isMainSession(e),o=n.getSessionType(e);i||o===t.SessionType.ServerSessionFederated||n.removeSession(e)});const o=window.location.href,s=(0,t.getAppStore)().getState().queryObject;let l=e&&t.urlUtils.getHrefFromLinkTo(e,s);l&&0!==l.indexOf("https://")&&(l=`https://${window.location.host}${l}`),l=l||o,n.signOut({redirectUrl:l})}function p(){let e;const i=t.SessionManager.getInstance().getMainSession(),n=(0,t.getAppStore)().getState().user,o=(0,t.getAppStore)().getState().portalUrl;return n&&n.thumbnail&&(e=`${o}/sharing/rest/community/users/${n.username}/info/${n.thumbnail}?token=${null==i?void 0:i.token}`),e}!function(e){e.default="DEFAULT",e.iconOnly="ICON_ONLY",e.labelOnly="LABEL_ONLY",e.linkLabelOnly="LINK_LABEL_ONLY"}(a||(a={})),function(e){e.Left="LEFT",e.Right="RIGHT"}(d||(d={}));var m=l(1888);const f="Restricted resources",I=l(137),y=({config:n})=>{const{useMemo:o}=t.React,s=t.SessionManager.getInstance().getMainSession(),l=(0,t.getAppStore)().getState().user,r=n.functionConfig.loginOptions,a=p(),d=`${(null==l?void 0:l.firstName)||""} ${(null==l?void 0:l.lastName)||""}`,g=(null==l?void 0:l.username)||"",c=o(()=>a?(0,e.jsx)("img",{src:a,width:50,height:50,style:{borderRadius:"50%"},className:"d-block float-left header-login"}):(0,e.jsx)(i.Icon,{icon:I,width:50,height:50,className:"d-block float-left header-login"}),[a]);return(r.userAvatar||r.username)&&(0,e.jsxs)("div",{children:[(0,e.jsx)(i.DropdownItem,{tabIndex:0,className:"login-dropdown-item header-item p-4",tag:"div",children:(0,e.jsxs)("div",{className:"d-flex user-info-content",children:[r.userAvatar&&(0,e.jsx)("div",{className:"header-portrait",children:c}),(0,e.jsxs)("div",{className:"user-title-content flex-grow-1",children:[r.username&&s&&(0,e.jsx)("div",{className:"user-title main-title",title:d,children:d}),r.username&&s&&(0,e.jsx)("div",{className:"user-title sub-title",title:g,children:g})]})]})}),(0,e.jsx)(i.DropdownItem,{className:"login-dropdown-item divider-item",divider:!0,tag:"div"})]})},x=({intl:n,config:o,appMode:s,closeCallback:l})=>{var r;const{useCallback:a}=t.React,d=a(()=>{l(),!window.jimuConfig.isInBuilder&&g()&&t.SessionManager.getInstance().switchAccount()},[l]),c=a(()=>{var e;u(o.functionConfig.afterLogoutLinkParam,null===(e=o.functionConfig)||void 0===e?void 0:e.loginOptions.logoutAllResources)},[o.functionConfig.afterLogoutLinkParam,null===(r=o.functionConfig)||void 0===r?void 0:r.loginOptions.logoutAllResources]),p=n.formatMessage({id:"switchAccount",defaultMessage:i.defaultMessages.switchAccount}),m=n.formatMessage({id:"signOut",defaultMessage:i.defaultMessages.signOut});return(0,e.jsxs)("div",{children:[(0,e.jsx)(i.DropdownItem,{title:p,className:"login-dropdown-item link-item w-100 h-100 d-flex",onClick:d,tag:"button",role:"menuitem",disabled:s===t.AppMode.Design,children:(0,e.jsx)("div",{className:"text-truncate",children:p})}),(0,e.jsx)(i.DropdownItem,{title:m,className:"login-dropdown-item link-item w-100 h-100 d-flex",onClick:c,tag:"button",role:"menuitem",disabled:s===t.AppMode.Design,children:(0,e.jsx)("div",{className:"text-truncate",children:m})})]})},h=({title:n,url:o,appMode:s})=>(0,e.jsx)(i.DropdownItem,{title:n,tag:"a",className:"login-dropdown-item link-item link-con w-100 h-100 d-flex",href:o,target:"_blank",role:"menuitem",disabled:s===t.AppMode.Design,children:(0,e.jsx)("div",{className:"text-truncate",children:n})}),v=(0,m.styled)(i.Popper)(({theme:e,styleState:t})=>{var i;const n=null===(i=null==t?void 0:t.dropdownRegularStyle)||void 0===i?void 0:i.fontSize,o={fontSize:"var(--sys-typography-label1-font-size)",".main-title":{fontSize:n||"var(--sys-typography-title1-font-size)",fontWeight:"600"},".user-name":{fontSize:n||"var(--sys-typography-label3-font-size)"}},s=null==t?void 0:t.dropdownRegularStyle,l=null==t?void 0:t.dropdownHoverStyle,r=Object.assign(Object.assign(Object.assign({},o),null==t?void 0:t.dropdownRegularStyle),{"button, a":s}),a=Object.assign(Object.assign({},(null==t?void 0:t.dropdownHoverStyle)||{}),{"button, a, div":l});return Object.assign(Object.assign({},r),{"&:hover":a})}),M=s=>{const{useMemo:l,useState:r,useEffect:a,useCallback:d}=t.React,{config:g,theme:c,intl:u,widgetId:p,active:m,appMode:I,noPermissionResourceChangedFlag:M,buttonRef:b}=s,w=g.styleConfig,S=g.functionConfig.loginOptions,j=S.useAdvanceLogin,C=(0,t.getAppStore)().getState(),A=(C.widgetsState[p]||(0,t.Immutable)({})).isConfiguringHover,[N,O]=r(!1),[L,D]=r(!0),P=d(()=>{O(!1)},[]),k=l(()=>{let t=[];return S.userProfile&&t.push({id:"my_profile",label:u.formatMessage({id:"myProfile",defaultMessage:i.defaultMessages.myProfile}),url:`${C.portalUrl}/home/user.html`}),S.userSetting&&t.push({id:"user_setting",label:u.formatMessage({id:"mySettings",defaultMessage:i.defaultMessages.mySettings}),url:`${C.portalUrl}/home/user.html#settings`}),t=t.concat(S.links),(0,e.jsxs)("div",{children:[t.map(t=>(0,e.jsx)(h,{title:t.label,url:t.url,appMode:I},t.id)),t.length>0&&(0,e.jsx)(i.DropdownItem,{className:"login-dropdown-item divider-item",divider:!0,tag:"div"})]})},[S,I,u,C.portalUrl]),R=l(()=>w.customStyle&&o(w.customStyle,0,m,I,A)||{},[w.customStyle,p,m,I,A]);a(()=>{j&&!L?O(!0):(O(!1),!j&&L&&D(!1))},[j,L]),a(()=>{null!==s.open&&O(e=>!e)},[s.open]);const z=d(()=>{(0,t.getAppStore)().getState().appRuntimeInfo.appMode===t.AppMode.Run&&O(!1)},[]);return(0,e.jsx)(v,{autoUpdate:!0,open:N,reference:b,css:n(c),styleState:R,toggle:z,flipOptions:!0,placement:"bottom-end",children:(0,e.jsxs)(i.Paper,{className:"login-dropdown-box",children:[(0,e.jsx)(y,{config:g}),k,(()=>{const n=Object.assign({},t.SessionManager.getInstance().getNoPermissionResourceInfoList());window.jimuConfig.isInBuilder&&0===Object.entries(n).length&&(n["https://sample.server.com/arcgis/rest/services/service1/FeatureServer"]={signInErrorCode:t.SignInErrorCode.SignInCanceled});const o=u.formatMessage({id:"restrictedResources",defaultMessage:f});return Object.entries(n).length>0&&S.resourceCredentialList&&(0,e.jsxs)("div",{className:"p-1",children:[(0,e.jsx)("div",{className:"permission-list-title text-truncate","aria-label":o,children:o}),(0,e.jsx)(t.PermissionList,{noPermissionResourceChangedFlag:M,noPermissionResourceInfoList:n,disableOperation:window.jimuConfig.isInBuilder,theme:c,intl:u,allowLogout:!0}),(0,e.jsx)(i.DropdownItem,{className:"login-dropdown-item divider-item",divider:!0,tag:"div"})]})})(),(0,e.jsx)(x,{intl:u,config:g,appMode:I,closeCallback:P})]})})},b=l(137),{useState:w,useCallback:S,useMemo:j}=t.React,C=(0,m.styled)(i.Button)(({theme:e,styleState:t,className:i})=>{var n,o;const s=Object.assign(Object.assign(Object.assign({},{fontSize:"var(--sys-typography-label1-font-size)"}),null==t?void 0:t.regularStyle),{"& img, & svg":(null===(n=null==t?void 0:t.iconStyle)||void 0===n?void 0:n.regularStyle)||{}}),l=Object.assign(Object.assign({},null==t?void 0:t.hoverStyle),{"img, svg":(null===(o=null==t?void 0:t.iconStyle)||void 0===o?void 0:o.hoverStyle)||{}});return Object.assign(Object.assign({},s),{"&:hover":l})}),A=n=>{const[s,l]=w(null),{config:r,widgetId:d,active:m,appMode:f,intl:I}=n,y=r.functionConfig,x=null==y?void 0:y.icon,h=t.React.useRef(null),v=r.styleConfig,A=y.loginOptions.useAdvanceLogin,N=(0,t.getAppStore)().getState().user,O=y.usePopupLogin,L=(0,t.getAppStore)().getState().widgetsState[d]||(0,t.Immutable)({}),D=L.isConfiguringHover,P=p(),k=!(window.jimuConfig.isInBuilder&&L.isLogoutMode)&&g(),R=S(()=>{A?(k&&l(!s),!k&&c(O,y.afterLoginLinkParam)):k?u(y.afterLogoutLinkParam,null==y?void 0:y.loginOptions.logoutAllResources):c(O,y.afterLoginLinkParam)},[s,k,A,O,y.afterLoginLinkParam,y.afterLogoutLinkParam,null==y?void 0:y.loginOptions.logoutAllResources]),z=j(()=>v.customStyle&&o(v.customStyle,0,m,f,D)||{},[v.customStyle,d,m,f,D]),T=j(()=>{const e=I.formatMessage({id:"signIn",defaultMessage:i.defaultMessages.signIn}),t=I.formatMessage({id:"signOut",defaultMessage:i.defaultMessages.signOut});if(A){const t=((null==N?void 0:N.firstName)||(null==N?void 0:N.lastName)?`${(null==N?void 0:N.firstName)||""} ${(null==N?void 0:N.lastName)||""}`:"")||(null==N?void 0:N.username)||"";return k&&t?t:e}return k?t:e},[k,N,A,I]),E=j(()=>{const e=I.formatMessage({id:"userName",defaultMessage:"Username"});return A?`${e} ${T}`:""},[A,I,T]),U=j(()=>{const t=(0,e.jsx)(i.Icon,{className:"d-block avatar-icon",icon:b,width:24,height:24});return k?P?(0,e.jsx)("img",{src:P,width:24,height:24,style:{borderRadius:"50%"},className:"d-block float-left avatar-icon"}):t:x?(0,e.jsx)(i.Icon,{className:"avatar-icon",icon:x.data.svg,"aria-hidden":!0}):t},[x,P,k]);return(0,e.jsxs)("div",{className:"login-button-box w-100 h-100",children:[(0,e.jsxs)(C,{ref:h,styleState:z,className:`login-button ${y.quickStyleMode}`,type:y.quickStyleMode===a.linkLabelOnly?"link":"default",size:"sm",icon:!1,"aria-label":E,onClick:R,children:[y.quickStyleMode!==a.labelOnly&&y.quickStyleMode!==a.linkLabelOnly&&U,y.quickStyleMode!==a.iconOnly&&(0,e.jsx)("div",{className:"user-name text-truncate",children:T})]}),k&&(0,e.jsx)(M,Object.assign({},n,{open:s,buttonRef:h.current}))]})},{useSelector:N}=t.ReactRedux,O=i=>{const o=(0,t.Immutable)({functionConfig:{usePopupLogin:!0,quickStyleMode:a.default,loginOptions:{useAdvanceLogin:!1,logoutAllResources:!1,username:!0,userAvatar:!0,userProfile:!0,userSetting:!0,resourceCredentialList:!1,links:[]}},styleConfig:{themeStyle:{quickStyleType:"default"}}}).merge(i.config,{deep:!0}),s=N(e=>((e,t)=>{let i=!1;const n=e.appRuntimeInfo.selection;if(n&&e.appConfig.layouts[n.layoutId]){const o=e.appConfig.layouts[n.layoutId].content[n.layoutItemId];i=o&&o.widgetId===t.id}return{active:e.appContext.isInBuilder&&i,appMode:e.appRuntimeInfo.appMode,noPermissionResourceChangedFlag:e.noPermissionResourceChangedFlag}})(e,i)),{id:l,intl:r,theme:d}=i;return(0,e.jsx)("div",{className:"jimu-widget",css:n(i.theme),children:(0,e.jsx)(A,Object.assign({config:o,widgetId:l,intl:r,theme:d},s))})};function L(e){l.p=e}})(),r})())}}});