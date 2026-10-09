from django.core.management.base import BaseCommand
from apps.classifications.models import Category


def compose_description(short, keywords, disambiguation):
    """Compose the full description from its structured parts for backward compatibility."""
    parts = []
    if short:
        parts.append(short.rstrip('.') + ('.' if not keywords else ':'))
    if keywords:
        # Replace trailing period if we have keywords following
        if parts:
            parts[-1] = short.rstrip('.') + ':'
        parts.append(' ' + ', '.join(keywords) + '.')
    if disambiguation:
        parts.append(' ' + disambiguation.strip())
    return ''.join(parts).strip()


class Command(BaseCommand):
    help = 'Populate simplified categories (3 main + 7 meta aspects) with canonical-framework mapping and structured descriptions'

    def handle(self, *args, **options):
        self.stdout.write('Deleting existing categories...')

        deleted_count = Category.objects.all().delete()[0]
        self.stdout.write(f'Deleted {deleted_count} existing categories\n')

        self.stdout.write('Creating categories...')

        # 1. MAIN CLASSIFICATION (required, single choice)
        # First-level dichotomy: "citizen science as method" vs "citizen science as object"
        # Operationalized by Kullenberg & Kasperowski (2016); framed within meta-research per Ioannidis et al. (2015).
        main_cats = [
            {
                'code': 'main_scientific_results',
                'name': 'Findings through Citizen Science',
                'icon': 'Biotech',
                'description_short': 'In this paper, citizen science is the method, not the topic: the research investigates a question, problem or phenomenon, and citizen science is how the investigation was carried out. The findings are claims about that phenomenon — not about citizen science itself.',
                'keywords': [
                    'new species discoveries',
                    'supernova observations',
                    'biodiversity mapping',
                    'air-quality monitoring',
                    'disease surveillance',
                    'community-led environmental assessments',
                    'participatory mapping of urban inequalities',
                    'collaborative mathematical proofs',
                ],
                'disambiguation': 'Participation can take many forms (observation, data collection, co-investigation, problem framing, community partnership); what matters is the role citizen science plays in the paper, not how deep the participation goes. Rule of thumb: ask what the paper would be about if the citizen-science dimension were removed — if a substantive finding about something else remains, it is Findings through Citizen Science; if what remains is a study of how citizen science works, who participates, or what effects it produces, pick Findings about Citizen Science.',
                'order': 1,
                'ioannidis_pillar': 'none',
                'rri_key': 'none',
                'reference': 'Kullenberg, C., & Kasperowski, D. (2016). What Is Citizen Science? — A Scientometric Meta-Analysis. PLOS ONE, 11(1), e0147152. DOI: 10.1371/journal.pone.0147152. The paper explicitly distinguishes studies that use CS "as a method" (this category) from studies of "the phenomenon of CS" (see main_meta_research).',
            },
            {
                'code': 'main_meta_research',
                'name': 'Findings about Citizen Science',
                'icon': 'Psychology',
                'description_short': 'In this paper, citizen science is the topic, not the method: the research investigates citizen science itself — how it works, who participates, what it produces, how it should be done, and what it means.',
                'keywords': [
                    'validating volunteer-collected data against expert measurements',
                    'designing a new contribution platform',
                    "studying participants' motivations",
                    'assessing policy uptake of CS projects',
                    'theorising the epistemic role of lay knowledge',
                    'proposing a new framework for co-design',
                ],
                'disambiguation': 'Brings together two modes that are typically intertwined within the same paper: research that builds or improves the practice of citizen science (new methods, protocols, platforms, validation systems, frameworks) and research that analyses it as a phenomenon (participation, impact, ethics, politics, epistemology). If citizen science is used merely as an instrument to produce knowledge about a phenomenon that exists independently of the project, pick Findings through Citizen Science instead.',
                'order': 2,
                'ioannidis_pillar': 'none',
                'rri_key': 'none',
                'reference': 'Ioannidis, J. P. A., Fanelli, D., Dunne, D. D., & Goodman, S. N. (2015). Meta-research: Evaluation and Improvement of Research Methods and Practices. PLOS Biology, 13(10), e1002264. DOI: 10.1371/journal.pbio.1002264. Establishes meta-research as the scientific study of science itself. Operationalized for citizen science by Kullenberg & Kasperowski (2016) as "studying the phenomenon of CS" (this category) vs "using CS as a method" (see main_scientific_results).',
            },
            {
                'code': 'main_not_sure',
                'name': "Not sure / Can't decide",
                'icon': 'HelpOutline',
                'description_short': 'The abstract does not provide enough information to decide, or the case is genuinely ambiguous.',
                'keywords': [],
                'disambiguation': 'A valid and informative answer — cases that resist classification help reveal where the boundaries between categories are less clear, and they are reviewed separately by the research team.',
                'order': 3,
                'ioannidis_pillar': 'none',
                'rri_key': 'none',
                'reference': '',
            },
        ]

        created_main = {}
        for cat in main_cats:
            composed = compose_description(cat['description_short'], cat['keywords'], cat['disambiguation'])
            obj, created = Category.objects.get_or_create(
                code=cat['code'],
                defaults={
                    'name': cat['name'],
                    'description': composed,
                    'description_short': cat['description_short'],
                    'keywords': cat['keywords'],
                    'disambiguation': cat['disambiguation'],
                    'category_type': 'main',
                    'order': cat['order'],
                    'allows_multiple': False,
                    'icon': cat['icon'],
                    'ioannidis_pillar': cat['ioannidis_pillar'],
                    'rri_key': cat['rri_key'],
                    'reference': cat['reference'],
                }
            )
            created_main[cat['code']] = obj
            self.stdout.write(f"  {'Created' if created else 'Exists'}: {obj.name}")

        # 2. META-RESEARCH ASPECTS (multiple choice, conditional)
        meta_research_cat = created_main['main_meta_research']

        meta_aspects = [
            {
                'code': 'meta_participation',
                'name': 'Participation & Engagement',
                'icon': 'Groups',
                'description_short': 'Studies how participants engage with citizen science',
                'keywords': [
                    'motivations',
                    'retention',
                    'recruitment strategies',
                    'demographics',
                    'inclusion and diversity',
                    'barriers to participation',
                    'drop-out',
                    'contributor typology',
                    'volunteer behavior',
                ],
                'disambiguation': 'If the paper focuses on what participants LEARN from participating, consider Impact & Outcomes instead. If it focuses on how a platform feature (e.g. gamification) drives engagement, also mark Technology & Platforms.',
                'order': 1,
                'ioannidis_pillar': 'none',
                'rri_key': 'public_engagement',
                'reference': 'RRI key: Public Engagement. Stilgoe, J., Owen, R., & Macnaghten, P. (2013). Developing a framework for responsible innovation. Research Policy, 42(9), 1568-1580. EU Horizon 2020 RRI framework. Not a distinct Ioannidis 2015 pillar.',
            },
            {
                'code': 'meta_data_quality',
                'name': 'Data Quality & Validation',
                'icon': 'FactCheck',
                'description_short': 'Studies the accuracy and trustworthiness of data collected by volunteers',
                'keywords': [
                    'validation methods',
                    'agreement with expert/reference data',
                    'inter-rater reliability',
                    'bias correction',
                    'uncertainty and measurement error',
                    'quality control mechanisms',
                    'data cleaning and filtering',
                ],
                'disambiguation': 'If the paper is about the overall project design rather than assessing data, pick Methodology & Design. If AI/ML is used primarily for validation, also mark Technology & Platforms.',
                'order': 2,
                'ioannidis_pillar': 'reproducibility',
                'rri_key': 'none',
                'reference': 'Ioannidis et al. 2015 — Reproducibility pillar (sharing data and methods, repeatability, replicability) plus Methods (study design, statistics).',
            },
            {
                'code': 'meta_methodology',
                'name': 'Methodology & Design',
                'icon': 'AccountTree',
                'description_short': 'Studies how citizen science projects are designed and run',
                'keywords': [
                    'project design',
                    'protocols',
                    'task design',
                    'sampling strategies',
                    'data collection methods',
                    'implementation phases',
                    'workflows',
                    'co-design with participants',
                    'standardization',
                    'best practices',
                ],
                'disambiguation': 'If the focus is assessing data after collection, pick Data Quality & Validation. If the focus is the tool itself rather than the workflow, pick Technology & Platforms.',
                'order': 3,
                'ioannidis_pillar': 'methods',
                'rri_key': 'none',
                'reference': 'Ioannidis et al. 2015 — Methods pillar (study design, methods, statistics, research synthesis, collaboration).',
            },
            {
                'code': 'meta_impact',
                'name': 'Impact & Outcomes',
                'icon': 'TrendingUp',
                'description_short': 'Studies what citizen science produces beyond data collection',
                'keywords': [
                    'scientific outputs (publications, discoveries)',
                    'educational and learning outcomes for participants',
                    'policy uptake',
                    'behavior change',
                    'community benefits',
                    'environmental/conservation outcomes',
                    'science literacy',
                ],
                'disambiguation': 'Participant motivations belong to Participation & Engagement; participant learning belongs here.',
                'order': 4,
                'ioannidis_pillar': 'evaluation',
                'rri_key': 'science_education',
                'reference': 'Ioannidis et al. 2015 — Evaluation pillar (research impact assessment). RRI key Science Education covers learning outcomes of citizen science participation.',
            },
            {
                'code': 'meta_technology',
                'name': 'Technology & Platforms',
                'icon': 'SmartToy',
                'description_short': 'Studies how technology enables or shapes citizen science',
                'keywords': [
                    'mobile apps',
                    'platforms (iNaturalist, Zooniverse, eBird and similar)',
                    'sensors and IoT',
                    'gamification design',
                    'AI and machine-learning assistance',
                    'automated classification',
                    'dashboards and data visualization',
                    'infrastructure',
                    'interoperability',
                ],
                'disambiguation': 'If the paper only mentions the tool instrumentally but studies something else (e.g. validation, participation), pick the other aspect.',
                'order': 5,
                'ioannidis_pillar': 'none',
                'rri_key': 'none',
                'reference': 'Citizen-science-specific axis. Not covered by Ioannidis 2015 pillars (technology is instrumental there) nor by RRI keys. Supported by HCI literature: Preece (2016); Nov, Arazy & Anderson (2014); Bowser et al. (2013).',
            },
            {
                'code': 'meta_ethics',
                'name': 'Ethics & Legal',
                'icon': 'Gavel',
                'description_short': 'Studies ethical, legal and equity dimensions of citizen science',
                'keywords': [
                    'privacy',
                    'data ownership',
                    'authorship and credit attribution',
                    'informed consent',
                    'intellectual property',
                    'safety',
                    'equity and accessibility',
                    'FAIR data principles',
                    'power dynamics between scientists and volunteers',
                    'extractive practices',
                ],
                'disambiguation': 'Broad social concerns can overlap with Impact & Outcomes — pick Ethics & Legal only when normative or policy framing is the primary focus.',
                'order': 6,
                'ioannidis_pillar': 'none',
                'rri_key': 'ethics',
                'reference': 'RRI key: Ethics (Stilgoe et al. 2013; EU Horizon 2020). Treated as a separate axis. Ioannidis 2015 subsumes ethics inside the Methods pillar, but citizen science raises specific issues — authorship, credit attribution, equity — that justify its own dimension (Resnik, Elliott & Miller 2015; ECSA 10 Principles 2015).',
            },
            {
                'code': 'meta_theory',
                'name': 'Theory & Framework',
                'icon': 'MenuBook',
                'description_short': 'Studies citizen science itself as a field',
                'keywords': [
                    'definitions',
                    'typologies',
                    'theoretical frameworks',
                    'conceptual models',
                    'historical analysis',
                    'epistemology',
                    'disciplinary positioning',
                    'comparative frameworks',
                    'meta-analyses of the field',
                ],
                'disambiguation': 'If the paper proposes a framework specifically for designing projects, pick Methodology & Design unless the framework itself is the primary contribution.',
                'order': 7,
                'ioannidis_pillar': 'none',
                'rri_key': 'none',
                'reference': 'Field-specific conceptual work. Ioannidis 2015 explicitly positions philosophy/epistemology of science as an "interface" of meta-research, not a pillar. Harpe 2021 Organization pillar (research categorization) partially overlaps but is about institutional structure, not field-typology. Supported by Haklay (2013); Shirk et al. (2012); Eitzel et al. (2017).',
            },
        ]

        for aspect in meta_aspects:
            composed = compose_description(aspect['description_short'], aspect['keywords'], aspect['disambiguation'])
            obj, created = Category.objects.get_or_create(
                code=aspect['code'],
                defaults={
                    'name': aspect['name'],
                    'description': composed,
                    'description_short': aspect['description_short'],
                    'keywords': aspect['keywords'],
                    'disambiguation': aspect['disambiguation'],
                    'category_type': 'meta_aspect',
                    'order': aspect['order'],
                    'allows_multiple': True,
                    'show_if_parent_category': meta_research_cat,
                    'show_if_parent_values': ['main_meta_research'],
                    'icon': aspect['icon'],
                    'ioannidis_pillar': aspect['ioannidis_pillar'],
                    'rri_key': aspect['rri_key'],
                    'reference': aspect['reference'],
                }
            )
            self.stdout.write(f"  {'Created' if created else 'Exists'}: {obj.name}")

        total = Category.objects.count()
        self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully created {total} categories!'))
        self.stdout.write(self.style.SUCCESS(f'  - {Category.objects.filter(category_type="main").count()} main classifications'))
        self.stdout.write(self.style.SUCCESS(f'  - {Category.objects.filter(category_type="meta_aspect").count()} meta-research aspects'))
