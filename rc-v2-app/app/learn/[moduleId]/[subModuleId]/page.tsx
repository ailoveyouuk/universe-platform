// Server component — exports generateStaticParams, renders the client component
import ModuleViewerPage from './ModuleViewerPage'

export function generateStaticParams() {
  return [
    { moduleId: 'module-1', subModuleId: 'greenhouse-gas-emissions' },
    { moduleId: 'module-1', subModuleId: 'global-race-to-net-zero' },
    { moduleId: 'module-1', subModuleId: 'energy-transition' },
    { moduleId: 'module-1', subModuleId: 'fixed-offshore-wind' },
    { moduleId: 'module-1', subModuleId: 'floating-offshore-wind' },
    { moduleId: 'module-1', subModuleId: 'onshore-wind' },
    { moduleId: 'module-1', subModuleId: 'nuclear' },
    { moduleId: 'module-1', subModuleId: 'solar' },
    { moduleId: 'module-1', subModuleId: 'biomass' },
    { moduleId: 'module-1', subModuleId: 'hydropower' },
    { moduleId: 'module-1', subModuleId: 'hydrogen' },
    { moduleId: 'module-1', subModuleId: 'carbon-capture' },
    { moduleId: 'module-1', subModuleId: 'wave-tidal' },
    { moduleId: 'module-1', subModuleId: 'skills-roles' },
    { moduleId: 'module-1', subModuleId: 'future-renewables' },
  ]
}

export default function Page() {
  return <ModuleViewerPage />
}
