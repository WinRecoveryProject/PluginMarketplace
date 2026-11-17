# Privatliv

Denne wrapper indeholder instruktioner og en reference til den eksisterende App.
Den indfører ingen separat lagring, telemetri, netværksklient eller credentials.
Den tilsluttede AgentMemory-ASUS-tjeneste behandler de data, brugeren vælger at
læse eller gemme, efter dens eksisterende adgang, drift og datavilkår. Denne
wrapper udvider ikke delingskredsen og ændrer ikke tjenestens opbevaring.

Brug snævert projekt-/opgavescope. Undlad passwords, tokens, nøgler, auth-filer og
andre hemmeligheder. Eksport, deling, synkronisering og sletning kræver konkret
autorisation. Statisk audit må ikke automatisk gemme brugerdata.
