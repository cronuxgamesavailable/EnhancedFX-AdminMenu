# EnhancedFX Admin

A standalone, framework-independent in-game admin menu for FiveM and FiveM Enhanced servers.

## Install

1. Extract the `enhancedfx-admin` folder into `server-data/resources/[local]`.
2. Add `ensure enhancedfx-admin` to `server.cfg`.
3. Give your admins ACE permissions. Replace the example FiveM identifier with your own:

```cfg
add_ace group.admin enhancedfx.admin allow
add_principal identifier.fivem:YOUR_ID group.admin
```

`enhancedfx.admin` grants every EnhancedFX Admin permission. For restricted staff, grant only the permissions they need:

```cfg
add_ace group.moderator enhancedfx.menu allow
add_ace group.moderator enhancedfx.players allow
add_ace group.moderator enhancedfx.warn allow
add_ace group.moderator enhancedfx.kick allow
add_ace group.moderator enhancedfx.teleport allow
add_ace group.moderator enhancedfx.spectate allow
add_ace group.moderator enhancedfx.reports allow
```

Available permission objects:

- `enhancedfx.menu`
- `enhancedfx.players`
- `enhancedfx.kick`
- `enhancedfx.ban`
- `enhancedfx.warn`
- `enhancedfx.teleport`
- `enhancedfx.spectate`
- `enhancedfx.personal`
- `enhancedfx.vehicle`
- `enhancedfx.items`
- `enhancedfx.weapons`
- `enhancedfx.density`
- `enhancedfx.map`
- `enhancedfx.stats`
- `enhancedfx.permissions`
- `enhancedfx.world`
- `enhancedfx.reports`
- `enhancedfx.resources`
- `enhancedfx.logs`

## Use

- Press **F10** or enter `/efxadmin` to open the menu.
- Players can submit staff reports with `/report <message>`.
- Persistent bans and audit entries are stored inside the resource's `data` folder.
- Every privileged action is validated on the server. Hiding or modifying the NUI does not bypass permissions.

## Included tools

- Live dashboard and player search
- Private staff messages, kick, warn, timed/permanent ban, freeze, cuff, heal, armor, revive and slay
- Copyable Cfx.re IDs, goto, bring, spectate, routing buckets, waypoint and coordinate teleport
- Noclip, god mode, invisibility, super jump, stamina, infinite ammo, player blips and ID overlays
- Vehicle spawn, repair, clean, flip, engine toggle, color picker, max tune and delete
- Item catalog for ox_inventory, QBCore or ESX, plus inventory wipe
- Weapon give/remove tools with a server-controlled allowlist
- Server-wide traffic, parked vehicle, random vehicle, pedestrian and scenario density controls
- Weather, time and announcements
- Player reports with claim/resolve workflow
- Resource start/stop/restart controls with protected core resources
- Persistent bans and searchable audit history
- Personal accent color wheel, presets, opacity, sound toggle and docked compact mode

## Framework adapters

The menu remains standalone. Item actions activate automatically when `ox_inventory`, `qb-core`, or `es_extended` is running. Edit `Items`, `Weapons`, `Framework`, and the optional `ClothingEvent` in `config.lua` to match your server.

