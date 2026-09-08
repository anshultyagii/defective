from abc import ABC, abstractmethod


class ModuleAEngine(ABC):
    """
    Common interface for every Module A implementation.

    The backend only depends on this interface.
    The actual ML model can change later.
    """

    @abstractmethod
    def predict(self, data):
        """
        Run Module A inference.

        Must return a ModuleAResponse-compatible result.
        """
        raise NotImplementedError