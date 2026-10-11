# Redistricting Assign widget

Custom ArcGIS Experience Builder widget for creating and reviewing redistricting scenarios.

## Requirements

- ArcGIS Experience Builder Developer Edition **1.19.0**.
- An ArcGIS account signed in to the Experience, with access to the configured web map and Feature Service.
- A polygon census-block layer containing `GEOID20` and `Population`.
- A Feature Service whose sublayers match the indexes used by `src/runtime/PlanService.ts`:
  - `0`: base census-block polygons
  - `1`: plans
  - `2`: plan districts
  - `3`: plan assignments
  - `4`: plan activity log

The widget uses the signed-in ArcGIS Hub/portal account in Experience Builder. Authenticated accounts whose ArcGIS role is `org_admin` see the administrator/review interface; every other authenticated ArcGIS account is treated as a community member, including public users who sign in through email providers such as Gmail. The email address is read only from the signed-in ArcGIS identity; an email address by itself does not authenticate a user or grant administrator access.

Feature Service permissions must allow the signed-in role to perform the reads and edits needed by its workflow. The widget uses the ArcGIS geometry union operator rather than the deprecated geometry engine module so it can run with the ArcGIS JavaScript API version used by Experience Builder Online.

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
6. Build and preview the Experience. Sign in with an account that can query the plans and assignment layers; verify the map layer order and Feature Service permissions if saved areas do not appear.

Saved assignments and the currently open plan display the individual assigned feature boundaries above the district fills, keeping nested feature extents visible.

## Tests

Run focused widget tests from the Experience Builder `client` directory:

```powershell
npm test -- --runInBand your-extensions/widgets/redistricting-assign/tests
```
