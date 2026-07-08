import { Events, ActivityType } from "discord.js";
import { logger, startupLog } from "../utils/logger.js";
import config from "../config/application.js";
import { reconcileReactionRoleMessages } from "../services/reactionRoleService.js";
import { reconcileTicketPanels, reconcileVerificationPanels, reconcileReactionRolePanelHealth } from "../services/panelHealthService.js";
import { reconcileLevelRoles } from "../services/levelRoleSyncService.js";
import { initRiffyAfterReady } from "../services/music/riffySetup.js";

const SCARA_STATUS_TEXT = "do not waste my time";

const SCARA_STATUS_EMOJI = {
  id: "1512102960568598670",
  name: "scaramouche_gmfu",
  animated: true,
};

async function setScaramouchePresence(client) {
  await client.user.setPresence({
    status: "idle",
    activities: [
      {
        name: "Custom Status",
        type: ActivityType.Custom,
        state: SCARA_STATUS_TEXT,
        emoji: SCARA_STATUS_EMOJI,
      },
    ],
  });

  await client.user.setStatus("idle");

  startupLog(`Presence set: idle + ${SCARA_STATUS_TEXT}`);
}

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    try {
      await setScaramouchePresence(client);

      startupLog(`Presence after set: ${JSON.stringify(client.user.presence?.activities || [])}`);

      startupLog(`Ready! Logged in as ${client.user.tag}`);
      startupLog(`Serving ${client.guilds.cache.size} guild(s)`);
      startupLog(`Loaded ${client.commands.size} commands`);

      if (client.config?.features?.music) {
        initRiffyAfterReady(client);
      }

      const reconciliationSummary = await reconcileReactionRoleMessages(client);
      startupLog(
        `Reaction role reconciliation: scanned ${reconciliationSummary.scannedMessages}, removed ${reconciliationSummary.removedMessages}, errors ${reconciliationSummary.errors}`
      );

      const ticketPanelSummary = await reconcileTicketPanels(client);
      startupLog(
        `Ticket panel health: scanned ${ticketPanelSummary.scannedGuilds} guilds, healthy ${ticketPanelSummary.healthyPanels}, deleted ${ticketPanelSummary.deletedPanels}, missing channel ${ticketPanelSummary.missingChannels}, recovered ${ticketPanelSummary.recoveredIds}, errors ${ticketPanelSummary.errors}`
      );

      const verificationPanelSummary = await reconcileVerificationPanels(client);
      startupLog(
        `Verification panel health: scanned ${verificationPanelSummary.scannedGuilds} guilds, healthy ${verificationPanelSummary.healthyPanels}, deleted ${verificationPanelSummary.deletedPanels}, missing channel ${verificationPanelSummary.missingChannels}, recovered ${verificationPanelSummary.recoveredIds}, errors ${verificationPanelSummary.errors}`
      );

      const reactionRolePanelSummary = await reconcileReactionRolePanelHealth(client);
      startupLog(
        `Reaction role panel health: scanned ${reactionRolePanelSummary.scannedPanels} panels, healthy ${reactionRolePanelSummary.healthyPanels}, deleted ${reactionRolePanelSummary.deletedPanels}, missing channel ${reactionRolePanelSummary.missingChannels}, recovered ${reactionRolePanelSummary.recoveredIds}, errors ${reactionRolePanelSummary.errors}`
      );

      const levelRoleSummary = await reconcileLevelRoles(client);
      startupLog(
        `Level role sync: scanned ${levelRoleSummary.scannedGuilds} guilds, pruned ${levelRoleSummary.prunedRewardEntries} stale rewards, re-awarded ${levelRoleSummary.rolesReAwarded} roles, errors ${levelRoleSummary.errors}`
      );

      setTimeout(async () => {
        try {
          await setScaramouchePresence(client);
          startupLog("Delayed presence refresh complete.");
        } catch (error) {
          logger.warn("Delayed presence refresh failed:", error.message);
        }
      }, 10000);
    } catch (error) {
      logger.error("Error in ready event:", error);
    }
  },
};
