// cowAI.js
// Simple Zombie Cow AI: Idle → Chase → Attack
// Drop this file into your project and import/update in your world update loop

export function updateCow(cow, player, delta) {

    const AGGRO_RANGE = 18;
    const ATTACK_RANGE = 4;
    const MOVE_SPEED = 2.3;

    const dx = player.position.x - cow.position.x;
    const dz = player.position.z - cow.position.z;

    const distance = Math.sqrt(dx * dx + dz * dz);

    // rotate cow to face the player
    const targetAngle = Math.atan2(dx, dz);
    cow.rotation.y = targetAngle;

    // --- AI states ---

    if (distance > AGGRO_RANGE) {

        cow.state = "IDLE";
        return;

    }

    if (distance > ATTACK_RANGE) {

        cow.state = "CHASE";

        cow.position.x += Math.sin(targetAngle) * MOVE_SPEED * delta;
        cow.position.z += Math.cos(targetAngle) * MOVE_SPEED * delta;

        return;

    }

    cow.state = "ATTACK";

    // placeholder for attack logic later
    // example: cow.attack(player)

}
