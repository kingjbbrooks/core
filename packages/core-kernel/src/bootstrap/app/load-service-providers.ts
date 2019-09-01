import { Identifiers, inject, injectable } from "../../container";
import { Application } from "../../contracts/kernel";
import { PackageConfiguration, PackageManifest, ServiceProvider, ServiceProviderRepository } from "../../providers";
import { ConfigRepository } from "../../services/config";
import { JsonObject } from "../../types";
import { Bootstrapper } from "../interfaces";

interface PackageEntry {
    package: string;
    options: JsonObject;
}

/**
 * @export
 * @class LoadServiceProviders
 * @implements {Bootstrapper}
 */
@injectable()
export class LoadServiceProviders implements Bootstrapper {
    /**
     * The application instance.
     *
     * @private
     * @type {Application}
     * @memberof Local
     */
    @inject(Identifiers.Application)
    private readonly app: Application;

    /**
     * @private
     * @type {ConfigRepository}
     * @memberof RegisterBasePaths
     */
    @inject(Identifiers.ConfigRepository)
    private readonly configRepository: ConfigRepository;

    /**
     * @private
     * @type {ServiceProviderRepository}
     * @memberof RegisterBasePaths
     */
    @inject(Identifiers.ServiceProviderRepository)
    private readonly serviceProviderRepository: ServiceProviderRepository;

    /**
     * @returns {Promise<void>}
     * @memberof RegisterProviders
     */
    public async bootstrap(): Promise<void> {
        for (const pkg of this.configRepository.get<Array<PackageEntry>>("packages")) {
            const serviceProvider: ServiceProvider = this.app.resolve(require(pkg.package).ServiceProvider);
            serviceProvider.setManifest(this.app.resolve(PackageManifest).discover(pkg.package));
            serviceProvider.setConfig(this.discoverConfiguration(serviceProvider, pkg.options));

            this.serviceProviderRepository.set(pkg.package, serviceProvider);
        }
    }

    /**
     * Discover the configuration for the package of the given service provider.
     *
     * @private
     * @param {ServiceProvider} serviceProvider
     * @param {JsonObject} opts
     * @returns {PackageConfiguration}
     * @memberof LoadServiceProviders
     */
    private discoverConfiguration(serviceProvider: ServiceProvider, opts: JsonObject): PackageConfiguration {
        const hasDefaults: boolean = Object.keys(serviceProvider.configDefaults()).length > 0;

        if (hasDefaults) {
            return this.app
                .resolve(PackageConfiguration)
                .from(serviceProvider.name(), serviceProvider.configDefaults())
                .merge(opts);
        }

        return this.app
            .resolve(PackageConfiguration)
            .discover(serviceProvider.name())
            .merge(opts);
    }
}
