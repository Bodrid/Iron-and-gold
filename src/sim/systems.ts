// Registers every simulation system and command handler with step(). Order of imports = order systems run.
import './combat';
import './troops';
import './war';
import './economy';
import './population';
import './naval/trade';
import './naval/ships';
import './naval/invasion';
import './diplomacy/relations';
import './diplomacy/treaties';
import './diplomacy/infamy';
import './ai/ai';
import './victory';
