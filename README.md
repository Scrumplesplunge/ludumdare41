# Dungeon Solitaire

This game is a mashup of Solitaire and a Dungeon Crawler. You can play the
[competition version](http://www.joe-fowler.co.uk/misc/ludumdare41) or the
[latest version](http://www.joe-fowler.co.uk/misc/ludumdare41/post) online.

This game was developed for **Chrome** and has **sound effects and music**.

## How to play

The player must collect cards by killing enemies spread throughout a dungeon,
and use them to complete a game of Solitaire by interacting with the walls of
the card room.

The player can carry up to 13 cards simultaneously but they must stack like an
upside down solitaire stack; if the top card in the player's inventory is a red
6, the next card must be a black 7, for example.

To aid the player, there are power-ups strewn about the world. Yellow stars
increase the player's max health. Blue plusses fully heal the player. Purple
stars upgrade the player's weapon.

## Weapons

There are three different kinds weapon that the player can have:

  * **Fists** do a single hitpoint of damage and have a range of 1 block.
  * The **dagger** does twice as much damage with half the range.
  * The **pistol** does a single hitpoint of damage, but at long range.

## Player Death

If the player dies, all power-ups are lost and the player respawns in the card
room. Note however that the player keeps all the cards that they are carrying
when they die.

## Post-Compo Changes

Since this game was created as [an entry to Ludum Dare
41](https://ldjam.com/events/ludum-dare/41/dungeon-solitaire), this section
lists code changes that have happened since the competition ended.

### Bug Fixes

  * Removed dependence on `window.event` and added a compatibility workaround
    to make the game work in Firefox.

### Feature Changes

  * Hitting enemies (with any weapon) now has knockback.
  * Enemies now bob up and down when moving.
  * Changed HUD to show what type of card the player can pick up next.
