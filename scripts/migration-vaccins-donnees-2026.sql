-- Contenu réel de la table vaccins (schéma créé par migration-vaccins.sql),
-- en remplacement des 4 lignes d'exemple initialement prévues comme
-- placeholder. 18 vaccins couvrant les usages les plus courants en officine.
--
-- Sources :
-- - Schéma vaccinal, statut obligatoire/recommandé, cas particuliers :
--   Calendrier des vaccinations et recommandations vaccinales 2026,
--   Ministère de la Santé (édition avril 2026), via le skill
--   vaccins-calendrier-fr.
-- - Conditions de prescription par le pharmacien (11 ans et plus, sauf
--   vaccins vivants chez l'immunodéprimé) : décret n° 2023-736 du 8 août
--   2023 — sourcé via recherche web (article + synthèse), PAS vérifié mot à
--   mot sur Légifrance. À confirmer sur le texte réglementaire si une
--   précision juridique exacte est nécessaire.
-- - Taux de remboursement : vérifiés directement sur ameli.fr (page
--   "Vaccination : quelle prise en charge ?" et pages dédiées aux honoraires
--   pharmaciens) et la Base de données publique des médicaments
--   (base-donnees-publique.medicaments.gouv.fr). Corrigés en cours de
--   conversation (zona : 65 %, pas 30 % ; VRS chez les 65 ans et plus : non
--   remboursé à ce jour, désaccord de prix labos/CEPS malgré avis HAS
--   favorable depuis octobre 2024).
--
-- Volontairement exclus de ce jeu de données (vaccins de niche/spécialisés,
-- peu pertinents en référence de comptoir courante) : dengue (Qdenga), rage,
-- leptospirose, variole B/Mpox. Également exclu : Beyfortus (nirsévimab),
-- qui n'est pas un vaccin au sens strict (anticorps monoclonal, immunisation
-- passive du nourrisson) mais fait partie de la même stratégie de
-- prévention du VRS.
--
-- Remboursement Stamaril (fièvre jaune, Guyane) : non détaillé sur les pages
-- ameli.fr consultées pour ce module — signalé comme tel dans la fiche
-- plutôt que d'avancer un chiffre non vérifié.
insert into vaccins
  (nom_commercial, valences, schema_vaccinal, statut, conditions_prescription, remboursement, cas_particuliers, source, date_maj)
values
(
  'Infanrix Hexa / Hexyon / Vaxelis',
  array['Diphtérie','Tétanos','Coqueluche','Poliomyélite','Haemophilus influenzae b','Hépatite B'],
  'Primovaccination obligatoire du nourrisson : 2 doses à 2 mois et 4 mois, puis rappel à 11 mois (schéma 2+1). Prématurés/enfants à risque : schéma renforcé à 3 doses (2, 3, 4 mois) + rappel à 11 mois.',
  'obligatoire',
  'Vaccination du nourrisson réalisée par un médecin, une sage-femme, un infirmier ou en PMI, hors champ de compétence du pharmacien pour cette tranche d’âge (le pharmacien peut prescrire et administrer les vaccins du calendrier vaccinal à partir de 11 ans, décret n° 2023-736 du 8 août 2023).',
  'Remboursé à 65 % par l’Assurance Maladie (vaccins obligatoires du nourrisson), le reste pris en charge par la mutuelle.',
  'Schéma renforcé (3 doses) si prématuré <33 SA et/ou <1500 g avec antécédent d’apnée/oxygénodépendance/bronchodysplasie : surveillance cardio-respiratoire 48h après la 1re injection. En cas de tension d’approvisionnement, l’hexavalent est prioritairement maintenu pour le schéma 2, 4, 11 mois.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr et la Base de données publique des médicaments',
  '2026-04-01'
),
(
  'Boostrixtetra / Repevax',
  array['Diphtérie','Tétanos','Coqueluche','Poliomyélite'],
  'Rappels à doses réduites (dTcaP) : 6 ans, 11-13 ans, puis à l’âge adulte 25, 45, 65 ans et tous les 10 ans ensuite. Depuis l’arrêt de commercialisation de Revaxis (dTP), tous les rappels adultes comportent systématiquement la valence coqueluche.',
  'recommandé',
  'Le pharmacien peut prescrire et administrer ce rappel dès 11 ans (décret n° 2023-736 du 8 août 2023).',
  'Remboursé à 65 % par l’Assurance Maladie, le reste pris en charge par la mutuelle.',
  'Grossesse : dTcaP recommandé à chaque grossesse, dès le 2e trimestre (de préférence 20-36 SA). Cocooning : entourage d’un nouveau-né si la mère n’a pas été vaccinée pendant la grossesse. Professionnels au contact de nourrissons de moins de 6 mois : rappel recommandé si non fait ou si dernière dose de plus de 5 ans.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'M-M-RVaxPro / Priorix',
  array['Rougeole','Oreillons','Rubéole'],
  'Obligatoire : 1re dose à 12 mois, 2e dose à 16-18 mois. Personnes nées depuis 1980 non à jour : 2 doses au total (intervalle minimal 1 mois), quels que soient les antécédents connus.',
  'obligatoire',
  'Nourrisson : administré par un médecin, une sage-femme ou en PMI. Rattrapage adulte : le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023).',
  'Remboursé à 100 % par l’Assurance Maladie pour les enfants et jeunes jusqu’à 17 ans inclus ; 65 % à partir de 18 ans (rattrapage adulte).',
  'Contre-indiqué en cas de grossesse (vaccin vivant atténué) — éviter une grossesse dans le mois suivant l’injection ; une vaccination par inadvertance n’est pas un motif d’IVG. Autour d’un cas de rougeole : nourrissons de 6-11 mois = 1 dose dans les 72h suivant le contact.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Bexsero',
  array['Méningocoque B'],
  'Obligatoire pour les enfants nés à compter du 1er janvier 2023 : 2 doses à 3 mois et 5 mois, rappel à 12 mois. Rattrapage possible jusqu’à 24 mois. Proposé (non obligatoire) entre 15 et 24 ans révolus.',
  'obligatoire',
  'Nourrisson : administré par un médecin, une sage-femme ou en PMI. Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023).',
  'Remboursé à 65 % par l’Assurance Maladie, le reste pris en charge par la mutuelle.',
  'Personnes à risque élevé (déficit en complément, asplénie, greffe de cellules souches hématopoïétiques) : rappel tous les 5 ans.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Nimenrix / MenQuadfi',
  array['Méningocoque A','Méningocoque C','Méningocoque W','Méningocoque Y'],
  'Obligatoire pour les enfants nés à compter du 1er janvier 2023 : 1 dose à 6 mois, rappel à 12 mois. Rattrapage obligatoire 12-24 mois si jamais vacciné. Ados 11-14 ans : 1 dose recommandée quel que soit le statut antérieur. Rattrapage 15-24 ans révolus : 1 dose.',
  'obligatoire',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023). Nourrisson : médecin, sage-femme ou PMI.',
  'Remboursé à 65 % par l’Assurance Maladie ; 100 % et gratuit dans le cadre du programme de vaccination au collège (classe de 5e, avec le HPV, depuis 2025-2026).',
  'Autour d’un cas d’infection invasive à méningocoque A/C/W/Y : vaccination des sujets contacts dans les 10 jours suivant le contact.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Prevenar13 / Vaxneuvance',
  array['Pneumocoque (13 ou 15 sérotypes selon le vaccin)'],
  'Obligatoire chez le nourrisson : 2 doses à 2 mois et 4 mois, rappel à 11 mois. Prématurés/enfants à risque : schéma renforcé à 3 doses (2, 3, 4 mois) + rappel à 11 mois.',
  'obligatoire',
  'Nourrisson : administré par un médecin, une sage-femme ou en PMI, hors champ de compétence du pharmacien pour cette tranche d’âge.',
  'Remboursé à 65 % par l’Assurance Maladie, le reste pris en charge par la mutuelle.',
  'Schéma renforcé si prématurité ou facteur de risque. Personnes à risque élevé (immunodéprimés, aspléniques, cardiopathie, insuffisance respiratoire/rénale, hépatopathie, diabète déséquilibré, brèche ostéoméningée, implant cochléaire) : schéma spécifique selon l’âge.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Prevenar20 / Capvaxive',
  array['Pneumocoque (20 ou 21 sérotypes selon le vaccin)'],
  'Adultes de 65 ans et plus : 1 dose unique (VPC20 ou VPC21), sans rappel établi à ce jour. Adultes à risque dès 18 ans : schéma selon les vaccins pneumococciques déjà reçus.',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023) ; indication ciblée à partir de 65 ans ou pour les adultes à risque.',
  'Remboursé à 65 % par l’Assurance Maladie, le reste pris en charge par la mutuelle.',
  'Chez les personnes à risque élevé déjà vaccinées par VPC13/VPP23, un schéma séquentiel spécifique s’applique selon les vaccins antérieurs et le délai écoulé.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Gardasil 9',
  array['HPV 6','HPV 11','HPV 16','HPV 18','HPV 31','HPV 33','HPV 45','HPV 52','HPV 58'],
  'Filles et garçons 11-14 ans révolus : 2 doses espacées de 5 à 13 mois. Rattrapage 15-26 ans révolus (élargi en 2026, hommes et femmes) : 3 doses (M0, M2, M6), sur moins d’un an.',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023). Gardasil 9 est le vaccin de référence pour toute nouvelle vaccination.',
  'Remboursé à 65 % par l’Assurance Maladie ; 100 % et gratuit dans le cadre du programme de vaccination au collège (classe de 5e, depuis 2023-2024).',
  'La vaccination HPV n’exempte pas du dépistage du cancer du col de l’utérus (frottis/test HPV-HR, 25-65 ans). Transplantation d’organe solide : la vaccination peut débuter dès 9 ans.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Vaxigrip / Influvac / Flucelvax',
  array['Grippe saisonnière'],
  '1 dose annuelle (dès 9 ans) ; 2 doses si 6 mois-8 ans révolus jamais vacciné (intervalle d’au moins 4 semaines).',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023) ; campagne annuelle élargie. Peut être proposé à tout enfant de 2 à 17 ans sans comorbidité.',
  'Remboursé à 100 % par l’Assurance Maladie pour les publics ciblés par la campagne (65 ans et plus, maladies chroniques, IMC ≥ 40, femmes enceintes dès le 6e mois, ALD, résidents en établissement médico-social) ; 65 % en dehors de ces publics.',
  'Recommandé aussi aux professionnels de santé et aux personnes en contact régulier avec des personnes à risque.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Efluelda / Fluad',
  array['Grippe saisonnière (dose renforcée ou adjuvantée)'],
  '1 dose annuelle, en amont de la saison hivernale (généralement dès début octobre).',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dans le cadre de la campagne annuelle. Formulation préférentielle à partir de 65 ans (les vaccins grippe standards restent aussi utilisables).',
  'Remboursé à 100 % par l’Assurance Maladie (public cible de la campagne, 65 ans et plus).',
  null,
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Comirnaty / Nuvaxovid',
  array['Covid-19'],
  'Nourrissons 6 mois-4 ans non vaccinés/non infectés : primo-vaccination 2 doses à 21 jours d’intervalle + 3e dose 8 semaines après. 5-11 ans : 1 dose. 12 ans et plus : 1 dose annuelle, quel que soit le passé vaccinal. Dose de printemps supplémentaire pour les 80 ans et plus, les immunodéprimés, les résidents EHPAD/USLD et les personnes à très haut risque.',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023). Comirnaty (ARNm) ou Nuvaxovid (protéine recombinante, à partir de 12 ans).',
  'Remboursé à 100 % par l’Assurance Maladie pour tous, dès 5 ans, y compris hors des publics à risque prioritairement ciblés.',
  'Délai minimal de 6 mois depuis la dernière dose/infection (réductible à 3 mois si 80 ans et plus, immunodéprimé, ou très haut risque). Grossesse : privilégier un vaccin à ARNm.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Engerix B20µg',
  array['Hépatite B'],
  'Adulte : schéma classique 0, 1, 6 mois. Ados 11-15 ans non vaccinés : 3 doses (M0, M1, M6) ou schéma allégé à 2 doses (M0, M6). Schéma accéléré possible (personnes détenues, départ imminent en zone d’endémie) : J0, J7, J21 + rappel à 12 mois.',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023). Obligation professionnelle légale (art. L.3111-4 du Code de la santé publique) pour les professionnels de santé listés, y compris les pharmaciens eux-mêmes, avec preuve d’immunisation requise.',
  'Remboursé à 65 % par l’Assurance Maladie, le reste pris en charge par la mutuelle.',
  'La primovaccination du nourrisson (dans l’hexavalent) est obligatoire ; ce schéma concerne le rattrapage recommandé jusqu’à 15 ans révolus et au-delà pour les populations à risque (partenaires multiples/IST, usagers de drogues IV, voyageurs en zone d’endémie, dialysés, entourage d’un porteur chronique...). Nouveau-né de mère porteuse de l’antigène HBs : vaccination impérative dans les 12h suivant la naissance, associée à des immunoglobulines — hors champ officine.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Rotarix / RotaTeq',
  array['Rotavirus'],
  'Recommandé chez tous les nourrissons de 6 semaines à 6 mois. Rotarix : 2 doses orales à 2 et 3 mois, à terminer avant 24 semaines. RotaTeq : 3 doses orales à 2, 3 et 4 mois, à terminer avant 32 semaines. Les deux vaccins ne doivent pas être mélangés dans un même schéma.',
  'recommandé',
  'Nourrisson : administré par un médecin, une sage-femme ou en PMI (vaccin oral), hors champ de compétence du pharmacien pour cette tranche d’âge.',
  'Remboursé à 65 % par l’Assurance Maladie, le reste pris en charge par la mutuelle.',
  'Contre-indiqué en cas d’antécédent d’invagination intestinale aiguë, de malformation gastro-intestinale non opérée, ou d’immunodépression connue/suspectée. Information systématique des parents sur le risque d’invagination intestinale aiguë dans les 7 jours suivant la 1re dose.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Shingrix',
  array['Zona'],
  '2 doses espacées de 2 mois (M0-M2), flexibilité possible entre 2 et 6 mois entre les doses (voire réduit à 1 mois si besoin d’immunisation rapide). Pas de rappel établi après la primovaccination.',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023) ; indication ciblée à partir de 65 ans (immunocompétent) ou dès 18 ans en cas d’immunodépression.',
  'Remboursé à 65 % par l’Assurance Maladie, dans le droit commun depuis décembre 2024 (auparavant non remboursé), le reste pris en charge par la mutuelle.',
  'Recommandé aussi en cas d’antécédent de zona ou de vaccination antérieure par Zostavax (délai d’au moins 1 an avant Shingrix). Avant une thérapie immunosuppressive, compléter le schéma idéalement 14 jours avant le traitement. Grossesse : à éviter par précaution.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr et Vidal.fr (déc. 2024)',
  '2026-04-01'
),
(
  'Abrysvo / Arexvy / mResvia',
  array['Virus respiratoire syncytial (VRS)'],
  'Grossesse : 1 dose d’Abrysvo entre 32 et 36 SA, en amont de la période épidémique. 75 ans et plus : 1 dose (Abrysvo, Arexvy ou mResvia, sans préférence entre les trois). 65-74 ans avec pathologie respiratoire chronique (BPCO) ou cardiaque (insuffisance cardiaque) : 1 dose, mêmes vaccins.',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023) ; indications ciblées grossesse/âge/comorbidité.',
  'Remboursé à 100 % chez la femme enceinte (protection du nourrisson). PAS remboursé à ce jour chez les 65-74 ans à risque et les 75 ans et plus par l’Assurance Maladie : avis favorable de la HAS depuis octobre 2024, mais désaccord de prix persistant entre les laboratoires et le CEPS (Comité économique des produits de santé) — situation à réévaluer périodiquement.',
  'Non recommandé chez la femme enceinte immunodéprimée (préférer l’immunisation passive du nouveau-né par anticorps monoclonal). Intervalle d’au moins 2 semaines avec le dTcaP pendant la grossesse. Alternative chez le nourrisson : anticorps monoclonal (Beyfortus dès la naissance, ou Synagis réservé aux prématurés/haut risque) — hors périmètre vaccinal strict.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié via communiqué Académie nationale de médecine (mars 2026)',
  '2026-04-01'
),
(
  'Varilrix / Varivax',
  array['Varicelle'],
  '2 doses espacées de 4 à 8 semaines (Varivax) ou de 6 à 10 semaines (Varilrix).',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023). Pas de vaccination généralisée des enfants — populations ciblées uniquement.',
  'Remboursé à 65 % par l’Assurance Maladie, le reste pris en charge par la mutuelle.',
  'Contre-indiqué en cas de grossesse (vaccin vivant atténué) — éviter une grossesse dans le mois suivant l’injection. Recommandé : adolescents 12-18 ans sans antécédent, femmes en âge de procréer sans antécédent, entourage de personnes immunodéprimées sans antécédent et séronégatives, candidats à une greffe d’organe.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Avaxim / Havrix / Vaqta',
  array['Hépatite A'],
  '1 dose + rappel 6 à 12 mois après (schéma variable selon le vaccin utilisé).',
  'recommandé',
  'Le pharmacien peut prescrire et administrer dès 11 ans (décret n° 2023-736 du 8 août 2023). Pas de vaccination générale — réservé aux populations à risque.',
  'Remboursé à 65 % par l’Assurance Maladie, le reste pris en charge par la mutuelle.',
  'Populations ciblées : mucoviscidose/hépatopathie chronique évolutive, enfants dès 1 an de familles originaires de pays de haute endémicité y séjournant, entourage d’un cas (à vacciner dans les 14 jours suivant le début des signes), personnes en situation d’hygiène précaire, certains professionnels (petite enfance, restauration collective, assainissement). En cas de pénurie durable : 1 seule dose pour les nouvelles vaccinations, sans rappel (sauf immunodéprimés).',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026) ; remboursement vérifié sur ameli.fr',
  '2026-04-01'
),
(
  'Stamaril',
  array['Fièvre jaune'],
  'Guyane : adultes et enfants de plus de 24 mois = 1 dose unique. Nourrissons de 9 à 24 mois : 1 dose + 2e dose à partir de 6 ans (délai maximal 10 ans). Nourrissons de 8 mois et moins : non indiqué sauf situation particulière.',
  'obligatoire',
  'Vaccination réservée à un centre agréé de vaccination antiamarile (pas n’importe quel professionnel de santé) — obligatoire pour les résidents de Guyane dès 12 mois et toute personne y séjournant.',
  'Modalités de remboursement spécifiques au contexte guyanais, non détaillées sur les pages ameli.fr consultées pour ce module — à vérifier séparément si besoin d’une fiche précise.',
  'Contre-indiqué en cas de grossesse et d’immunodépression (vaccin vivant atténué), sauf cas particuliers évalués au bénéfice/risque ; contre-indiqué en cas d’infection VIH avec CD4 bas. Allaitement : différer jusqu’aux 6 mois du nourrisson (sauf épidémie). 2e dose à 10 ans recommandée pour les professionnels de laboratoire exposés en Guyane, les femmes primo-vaccinées pendant la grossesse, les personnes vivant avec le VIH et les immunodéprimés.',
  'Calendrier des vaccinations et recommandations vaccinales 2026, Ministère de la Santé (avril 2026)',
  '2026-04-01'
);
