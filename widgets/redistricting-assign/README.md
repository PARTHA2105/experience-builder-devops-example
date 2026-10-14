# Redistricting Assign widget

Custom ArcGIS Experience Builder widget for creating and reviewing redistricting scenarios.

## Requirements

- ArcGIS Experience Builder Developer Edition **1.19.0**.
- An ArcGIS account signed in to the Experience, with access to the configured web map and Feature Service.
- A polygon census-block layer containing `GEOID20` and `Population`.
- Either the legacy combined Feature Service whose sublayers match the indexes used by `src/runtime/PlanService.ts`:
  - `0`: base census-block polygons
  - `1`: plans
  - `2`: plan districts
  - `3`: plan assignments
  - `4`: plan activity log
- Or a web map with the immutable census-block feature layer and the four editable scenario tables added as separate map tables. The table titles must identify them as `Plans`, `PlanDistricts`, `PlanAssignments`, and `PlanActivityLog` (spaces and letter case do not matter). The widget uses each table layer's actual service URL and layer ID, so the scenario tables can be hosted in a separate Feature Service and use different layer IDs.

The widget uses the signed-in ArcGIS Hub/portal account in Experience Builder. Authenticated accounts whose ArcGIS role is `org_admin` see the administrator/review interface; every other authenticated ArcGIS account is treated as a community member, including public users who sign in through email providers such as Gmail. The email address is read only from the signed-in ArcGIS identity; an email address by itself does not authenticate a user or grant administrator access.

When the visible Redistricting Assign widget loads in the published experience, the account card remains available and prompts for ArcGIS sign-in only when the user selects **Sign in**. By default, authentication uses the Experience Builder app's portal and OAuth client configuration. The widget reads the client ID from the app state or `appConfig.attributes.clientId`, so the app's registered ID can be reused by sign-in, account switching, and sign-out. If the deployed experience does not provide its OAuth client ID (as can happen with a static GitHub Pages build), set **OAuth client ID** in the widget settings in Experience Builder, then publish/redeploy the app. That value is stored in the deployed app's widget configuration rather than this widget's source files. This prevents committing the ID to source control; it does not make the ID secret, because browser users can inspect the public app configuration and OAuth request. If sign-in should use a different ArcGIS organization, also set **Authentication portal URL** (for example, `https://schoolsite.maps.arcgis.com`) and use a client ID registered with that portal. A client ID is a public application identifier; hiding or encrypting it in client-side code does not protect it. Never enter a client secret. For sign-out to clear the main Experience Builder account, use the same portal/client ID as the app's OAuth session. Select the account card in the sidebar to view account details, switch accounts, or sign out. **Switch account** forces the configured OAuth login prompt; sign-out clears the Experience Builder session without navigating away.

For this GitHub Pages deployment, set **Authentication portal URL** and **OAuth client ID** in the Redistricting Assign widget settings in Experience Builder (or configure the same portal and client ID as the Experience app's OAuth attributes). The application configuration must contain the new values after publishing; editing only the local widget files does not update an already deployed Experience. Register this exact callback URL in that OAuth application's redirect URI list:

`https://partha2105.github.io/experience-builder-devops-example/cdn/3/jimu-core/oauth-callback.html`

After publishing, verify the deployed app's widget configuration contains `oauthClientId` and (when using a separate portal) `authPortalUrl`, or that its app `attributes` contain the matching `clientId` and `portalUrl`. A missing client ID is reported in the widget instead of opening an invalid ArcGIS authorization request. The widget does not hard-code an OAuth client ID. OAuth client IDs are public identifiers, not secrets; a browser-based Experience Builder app cannot conceal them. Do not put an OAuth client secret in the widget. If Experience Builder temporarily detaches or restores the map, the widget clears stale map references and reinitializes its map-backed panels when the map returns without requiring a page refresh. Failed or cancelled sign-in leaves the existing session and map panel intact.

Feature Service permissions must allow the signed-in role to query the scenario tables and perform the edits needed by its workflow. Keep the census-block layer queryable; the widget does not edit it. If any scenario tables are present in the web map, all four required tables must be included with unique identifying titles. The widget uses the ArcGIS geometry union operator rather than the deprecated geometry engine module so it can run with the ArcGIS JavaScript API version used by Experience Builder Online.

## Install in Experience Builder Developer Edition

1. Install or use Experience Builder Developer Edition 1.19.0, following Esri's [installation guide](https://developers.arcgis.com/experience-builder/guide/install-guide/).
2. Copy this entire `redistricting-assign` folder into that installation's `client/your-extensions/widgets/` directory.
3. Start or rebuild the Experience Builder client from its `client` directory:

   ```powershell
   npm run build:dev
   ```

   For local development with automatic rebuilds, use `npm start`.
4. In Experience Builder, add the **Redistricting Assign** widget, select the map widget, and set **Base layer title** if the web map contains more than one polygon layer. Configure the optional Hub return URL and baseline plan only if the workflow uses them.
5. Ensure the app's map layout also includes a hidden instance of this widget with `config.overlayOnly` set to `true`, connected to the same map widget. This instance loads the signed-in user's saved assignment graphics at app startup, before the visible widget is opened.
6. Build and preview the Experience. Sign in with an account that can query the scenario tables and assignment layer; verify the map's table titles and Feature Service permissions if saved areas do not appear.

Saved assignments and the currently open plan display the individual assigned feature boundaries above the district fills, keeping nested feature extents visible.

## Tests

Run focused widget tests from the Experience Builder `client` directory:

```powershell
npm test -- --runInBand your-extensions/widgets/redistricting-assign/tests
```
