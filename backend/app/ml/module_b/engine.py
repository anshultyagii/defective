from abc import ABC, abstractmethod


class ModuleBEngine(ABC):
    """
    Common interface for every Module B implementation.
    """

    @abstractmethod
    def predict(self, data):
        """
        Run Module B inference.

        Must return a ModuleBResponse-compatible result.
        """
        raise NotImplementedError